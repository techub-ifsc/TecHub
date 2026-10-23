const { verifyToken, isTokenForCurrentPassword } = require('../utils/jwt');
const { User } = require('../models');
const { ROLES } = require('../constants/roles');

function sessionIsCurrent(payload, user) {
  // JWTs emitidos antes desta feature equivalem à versão inicial (zero).
  return (payload.authVersion ?? 0) === Number(user.authVersion || 0);
}

// Autentica a requisição pelo token Bearer e disponibiliza o usuário em req.user e req.userId.
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ message: 'Token de autenticação ausente.' });
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch (err) {
      return res.status(401).json({ message: 'Token inválido ou expirado.' });
    }

    // Suporta tanto JWT com subject padrão (sub) quanto payload com id direto
    const userId = payload.sub || payload.id;
    if (!userId) {
      return res.status(401).json({ message: 'Identificador de usuário ausente no token.' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(401).json({ message: 'Usuário não encontrado.' });
    }
    if (!sessionIsCurrent(payload, user) || !isTokenForCurrentPassword(payload, user)) {
      return res.status(401).json({ message: 'Sessão inválida. Entre novamente.' });
    }
    if (!user.emailVerifiedAt) {
      return res.status(403).json({ message: 'Confirme seu e-mail antes de acessar a plataforma.' });
    }

    // Injeta o model do usuário e o id direto para compatibilidade com todos os controllers
    req.user = user;
    req.userId = user.id;

    next();
  } catch (err) {
    next(err);
  }
}

// Para rotas públicas que mostram mais a quem está logado: com token válido preenche
// req.user; sem token, ou com token inválido, a requisição segue como visitante.
async function optionalAuthenticate(req, res, next) {
  try {
    const [scheme, token] = (req.headers.authorization || '').split(' ');
    if (scheme !== 'Bearer' || !token) return next();

    let payload;
    try {
      payload = verifyToken(token);
    } catch (err) {
      return next();
    }

    const userId = payload.sub || payload.id;
    const user = userId ? await User.findByPk(userId) : null;
    if (user && user.emailVerifiedAt
      && sessionIsCurrent(payload, user)
      && isTokenForCurrentPassword(payload, user)) {
      req.user = user;
      req.userId = user.id;
    }

    return next();
  } catch (err) {
    return next(err);
  }
}

// Cria um middleware que permite acesso somente aos perfis informados.
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({ message: 'Acesso negado para este recurso.' });
    }

    // Decisão do projeto: super_admin possui permissão total no sistema.
    if (req.user.role === ROLES.SUPER_ADMIN) {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Acesso negado para este recurso.' });
    }
    return next();
  };
}

module.exports = { authenticate, optionalAuthenticate, authorize };
