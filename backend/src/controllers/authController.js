const { User } = require('../models');
const { signToken } = require('../utils/jwt');
const { registerSchema, loginSchema, updateProfileSchema } = require('../validators/authValidators');
const { ApiError } = require('../middlewares/errorHandler');
const crypto = require('crypto');
const { sendVerificationEmail } = require('../services/mailService');
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


async function register(req, res, next) {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await User.findOne({ where: { email: data.email.toLowerCase() } });
    if (existing) {
      return res.status(409).json({ message: 'Já existe uma conta com este e-mail.' });
    }

    // Gera token seguro e define validade de 24h
    // const verificationToken = crypto.randomBytes(32).toString('hex');
    // const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // accountType foi validado contra a lista pública; role nunca é aceito diretamente.
    // Assim, ninguém consegue criar um super_admin pela API pública.
    const user = await User.create({
      name: data.name,
      email: data.email.toLowerCase(),
      password: data.password,
      role: data.accountType,
      // isEmailVerified: false,
      // emailVerificationToken: verificationToken,
      // emailVerificationExpires: tokenExpires,
    });

    // Envia o e-mail ANTES de responder a requisição
    //await sendVerificationEmail(user.email, verificationToken);

    // Responde sem token de sessão (exige confirmação antes do login)
    res.status(201).json({
      message: 'Cadastro realizado! Verifique seu e-mail em até 24 horas para ativar sua conta.',
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

    // if (!user.isEmailVerified) {
    //   return res.status(403).json({
    //     message: 'Confirme seu e-mail antes de acessar a plataforma.'
    //   });
    // }

    const token = signToken({ sub: user.id, role: user.role });
    res.json({ user: user.toSafeJSON(), token });
  } catch (err) {
    handleAuthError(err, res, next);
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
      user.email = data.email;
    }

    if (data.name) {
      user.name = data.name;
    }

    if (data.password) {
      user.password = data.password;
    }

    await user.save();

    res.json({ user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, me, updateProfile };
