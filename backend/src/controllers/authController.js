const { User } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const { signToken } = require('../utils/jwt');
const {
  registerSchema, loginSchema, updateProfileSchema, resendVerificationSchema,
  verifyEmailSchema, forgotPasswordSchema, resetPasswordSchema,
} = require('../validators/authValidators');
const { ApiError } = require('../middlewares/errorHandler');
const crypto = require('crypto');
const mailService = require('../services/mailService');
const { ROLES } = require('../constants/roles');
const { isCreatorEmailAllowed, getCreatorAllowedDomains } = require('../config/creatorDomain');

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCK_DURATION_MS = 15 * 60 * 1000;

// Mantém o formato de erro existente sem registrar SQL ou valores de credenciais.
function handleAuthError(err, res, next) {
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ message: 'Já existe uma conta com este e-mail.' });
  }
  if (err.name === 'SequelizeDatabaseError' || err.name.startsWith('SequelizeConnection')
    || err.name === 'SequelizeHostNotFoundError' || err.name === 'SequelizeHostNotReachableError'
    || err.name === 'SequelizeAccessDeniedError') {
    return res.status(503).json({ message: 'Serviço de contas indisponível. Tente novamente mais tarde.' });
  }
  return next(err);
}

function newOneTimeToken(ttlMs) {
  const token = crypto.randomBytes(32).toString('hex');
  return {
    token,
    tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
    expiresAt: new Date(Date.now() + ttlMs),
  };
}

const newVerification = () => newOneTimeToken(24 * 60 * 60 * 1000);
const newPasswordReset = () => newOneTimeToken(60 * 60 * 1000);

function mailUnavailable(res) {
  return res.status(503).json({ message: 'Envio de e-mail indisponível. Tente novamente mais tarde.' });
}


async function register(req, res, next) {
  try {
    const data = registerSchema.parse(req.body);

    try {
      mailService.assertMailConfigured();
    } catch {
      return mailUnavailable(res);
    }

    const existing = await User.findOne({ where: { email: data.email.toLowerCase() } });
    if (existing) {
      return res.status(409).json({ message: 'Já existe uma conta com este e-mail.' });
    }

    const verification = newVerification();

    // accountType foi validado contra a lista pública; role nunca é aceito diretamente.
    // Assim, ninguém consegue criar um super_admin pela API pública.
    const user = await User.create({
      name: data.name,
      email: data.email.toLowerCase(),
      password: data.password,
      role: data.accountType,
      emailVerifiedAt: null,
      emailVerificationTokenHash: verification.tokenHash,
      emailVerificationExpiresAt: verification.expiresAt,
    });

    try {
      await mailService.sendVerificationEmail(user.email, verification.token);
    } catch (error) {
      console.error('Falha no envio de confirmação de cadastro:', error.code || 'erro SMTP');
      return res.status(503).json({
        message: 'Conta criada, mas o e-mail não foi enviado. Solicite um novo link de confirmação.',
      });
    }

    // O cadastro não inicia sessão; a conta só pode entrar após confirmar o e-mail.
    res.status(201).json({
      message: 'Cadastro realizado. Confira seu e-mail para ativar a conta em até 24 horas.',
      user: user.toSafeJSON(),
    });
  } catch (err) {
    handleAuthError(err, res, next);
  }
}




// Confere e-mail e senha e gera uma nova sessão JWT para o usuário.
async function login(req, res, next) {
  try {
    const data = loginSchema.parse(req.body);
    const genericError = { message: 'E-mail ou senha inválidos.' };

    // A linha da conta fica bloqueada enquanto lemos e atualizamos o contador.
    // Assim, tentativas simultâneas não perdem incrementos umas das outras.
    const result = await sequelize.transaction(async (transaction) => {
      const user = await User.findOne({
        where: { email: data.email.toLowerCase() },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!user) return { status: 401, body: genericError };

      const now = new Date();
      const lockedUntil = user.lockedUntil && new Date(user.lockedUntil);
      if (lockedUntil && lockedUntil > now) {
        const retryAfterSeconds = Math.max(1, Math.ceil((lockedUntil - now) / 1000));
        const minutes = Math.ceil(retryAfterSeconds / 60);
        return {
          status: 429,
          retryAfterSeconds,
          body: {
            message: `Conta temporariamente bloqueada. Tente novamente em ${minutes} minuto${minutes === 1 ? '' : 's'}.`,
            retryAfterSeconds,
          },
        };
      }

      // Quando os 15 minutos terminam, a próxima tentativa inicia uma nova contagem.
      const lockExpired = Boolean(lockedUntil);
      if (lockExpired) {
        user.failedLoginAttempts = 0;
        user.lockedUntil = null;
      }

      const validPassword = await user.validatePassword(data.password);
      if (!validPassword) {
        user.failedLoginAttempts = Number(user.failedLoginAttempts || 0) + 1;
        if (user.failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
          user.lockedUntil = new Date(now.getTime() + LOGIN_LOCK_DURATION_MS);
        }
        await user.save({ transaction, silent: true });
        return { status: 401, body: genericError };
      }

      if (!user.emailVerifiedAt) {
        if (lockExpired) await user.save({ transaction, silent: true });
        return { status: 403, body: { message: 'Confirme seu e-mail antes de acessar a plataforma.' } };
      }

      // Uma autenticação concluída zera as falhas anteriores da conta.
      if (user.failedLoginAttempts || lockExpired) {
        user.failedLoginAttempts = 0;
        user.lockedUntil = null;
        await user.save({ transaction, silent: true });
      }
      const token = signToken({
        sub: user.id, role: user.role, authVersion: Number(user.authVersion || 0),
      });
      return { status: 200, body: { user: user.toSafeJSON(), token } };
    });

    if (result.retryAfterSeconds) {
      res.set('Retry-After', String(result.retryAfterSeconds));
    }
    return res.status(result.status).json(result.body);
  } catch (err) {
    handleAuthError(err, res, next);
  }
}

// Token aleatório de uso único. O banco armazena somente o hash SHA-256.
async function verifyEmail(req, res, next) {
  try {
    const { token } = verifyEmailSchema.parse(req.body);
    const tokenHash = crypto.createHash('sha256').update(token.toLowerCase()).digest('hex');
    const [updated] = await User.update({
      emailVerifiedAt: new Date(),
      emailVerificationTokenHash: null,
      emailVerificationExpiresAt: null,
    }, {
      where: {
        emailVerificationTokenHash: tokenHash,
        emailVerificationExpiresAt: { [Op.gt]: new Date() },
        emailVerifiedAt: null,
      },
    });
    if (!updated) {
      return res.status(400).json({ message: 'Link inválido, expirado ou já utilizado.' });
    }
    return res.json({ message: 'E-mail confirmado. Você já pode fazer login.' });
  } catch (err) {
    return handleAuthError(err, res, next);
  }
}

async function resendVerification(req, res, next) {
  try {
    const { email } = resendVerificationSchema.parse(req.body);
    const response = { message: 'Se existir uma conta não confirmada para este e-mail, enviaremos um novo link.' };
    const user = await User.findOne({ where: { email } });
    if (!user || user.emailVerifiedAt) return res.json(response);
    try {
      mailService.assertMailConfigured();
    } catch {
      return mailUnavailable(res);
    }
    const verification = newVerification();
    user.emailVerificationTokenHash = verification.tokenHash;
    user.emailVerificationExpiresAt = verification.expiresAt;
    await user.save();
    try {
      await mailService.sendVerificationEmail(user.email, verification.token);
    } catch (error) {
      console.error('Falha no reenvio de confirmação:', error.code || 'erro SMTP');
      return res.json(response);
    }
    return res.json(response);
  } catch (err) {
    return handleAuthError(err, res, next);
  }
}

// Resposta igual para e-mail cadastrado ou ausente: não revela a existência da conta.
async function forgotPassword(req, res, next) {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    try {
      mailService.assertPasswordResetConfigured();
    } catch {
      return mailUnavailable(res);
    }
    const response = {
      message: 'Se existir uma conta para este e-mail, enviaremos um link para redefinir a senha.',
    };
    const user = await User.findOne({ where: { email } });
    if (!user) return res.json(response);

    const reset = newPasswordReset();
    user.passwordResetTokenHash = reset.tokenHash;
    user.passwordResetExpiresAt = reset.expiresAt;
    await user.save({ silent: true });
    try {
      await mailService.sendPasswordResetEmail(user.email, reset.token);
    } catch (error) {
      // Não expor a existência da conta nem o token em mensagens ou logs.
      console.error('Falha no envio de redefinição de senha:', error.code || 'erro SMTP');
    }
    return res.json(response);
  } catch (err) {
    return handleAuthError(err, res, next);
  }
}

// A transação com bloqueio de linha impede que o mesmo link seja usado duas vezes.
async function resetPassword(req, res, next) {
  try {
    const data = resetPasswordSchema.parse(req.body);
    const tokenHash = crypto.createHash('sha256').update(data.token.toLowerCase()).digest('hex');
    const changedEmail = await sequelize.transaction(async (transaction) => {
      const user = await User.findOne({
        where: {
          passwordResetTokenHash: tokenHash,
          passwordResetExpiresAt: { [Op.gt]: new Date() },
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!user) return null;

      user.password = data.password;
      user.passwordResetTokenHash = null;
      user.passwordResetExpiresAt = null;
      user.authVersion = Number(user.authVersion || 0) + 1;
      await user.save({ transaction });
      return user.email;
    });
    if (!changedEmail) {
      return res.status(400).json({ message: 'Link inválido, expirado ou já utilizado.' });
    }

    // A alteração já foi confirmada no banco. Falha na notificação não a desfaz.
    try {
      await mailService.sendPasswordChangedEmail(changedEmail);
    } catch (error) {
      console.error('Falha no aviso de senha alterada:', error.code || 'erro SMTP');
    }
    return res.json({ message: 'Senha redefinida. Entre novamente com a nova senha.' });
  } catch (err) {
    return handleAuthError(err, res, next);
  }
}

// Retorna os dados seguros do usuário autenticado na requisição.
async function me(req, res) {
  res.json({ user: req.user.toSafeJSON() });
}

// Confirma a senha atual e atualiza os dados permitidos do perfil.
async function updateProfile(req, res, next) {
  try {
    const data = updateProfileSchema.parse(req.body);
    const user = req.user;

    const validCurrentPassword = await user.validatePassword(data.currentPassword);
    if (!validCurrentPassword) {
      throw new ApiError(401, 'Senha atual incorreta.');
    }

    let verification;
    if (data.email && data.email.toLowerCase() !== user.email) {
      if (user.role === ROLES.CREATOR && !isCreatorEmailAllowed(data.email)) {
        throw new ApiError(
          400,
          `Contas de criador exigem um destes domínios institucionais: ${getCreatorAllowedDomains().join(', ')}.`
        );
      }

      const existing = await User.findOne({ where: { email: data.email.toLowerCase() } });
      if (existing) {
        return res.status(409).json({ message: 'Já existe uma conta com este e-mail.' });
      }
      try {
        mailService.assertMailConfigured();
      } catch {
        return mailUnavailable(res);
      }
      verification = newVerification();
      user.email = data.email;
      user.emailVerifiedAt = null;
      user.emailVerificationTokenHash = verification.tokenHash;
      user.emailVerificationExpiresAt = verification.expiresAt;
    }

    if (data.name) {
      user.name = data.name;
    }

    if (data.password) {
      user.password = data.password;
    }

    await user.save();

    if (verification) {
      try {
        await mailService.sendVerificationEmail(user.email, verification.token);
      } catch (error) {
        console.error('Falha no envio após troca de e-mail:', error.code || 'erro SMTP');
        return res.status(503).json({
          message: 'E-mail alterado, mas a confirmação não foi enviada. Solicite um novo link.',
        });
      }
    }

    res.json({ user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register, login, verifyEmail, resendVerification,
  forgotPassword, resetPassword, me, updateProfile,
};
