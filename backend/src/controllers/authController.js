const { User } = require('../models');
const { Op } = require('sequelize');
const { signToken } = require('../utils/jwt');
const { registerSchema, loginSchema, updateProfileSchema, resendVerificationSchema, verifyEmailSchema } = require('../validators/authValidators');
const { ApiError } = require('../middlewares/errorHandler');
const crypto = require('crypto');
const mailService = require('../services/mailService');
const { ROLES } = require('../constants/roles');
const { isCreatorEmailAllowed, getCreatorAllowedDomains } = require('../config/creatorDomain');

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

function newVerification() {
  const token = crypto.randomBytes(32).toString('hex');
  return {
    token,
    tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  };
}

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

    const user = await User.findOne({ where: { email: data.email.toLowerCase() } });
    const genericError = { message: 'E-mail ou senha inválidos.' };

    if (!user) {
      return res.status(401).json(genericError);
    }

    const valid = await user.validatePassword(data.password);
    if (!valid) {
      return res.status(401).json(genericError);
    }

    if (!user.emailVerifiedAt) {
      return res.status(403).json({ message: 'Confirme seu e-mail antes de acessar a plataforma.' });
    }

    const token = signToken({ sub: user.id, role: user.role });
    res.json({ user: user.toSafeJSON(), token });
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

module.exports = { register, login, verifyEmail, resendVerification, me, updateProfile };
