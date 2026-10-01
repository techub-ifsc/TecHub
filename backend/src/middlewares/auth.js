const { verifyToken } = require('../utils/jwt');
const { User } = require('../models');
const { ROLES } = require('../constants/roles');

// Autentica a requisição pelo token Bearer e disponibiliza o usuário em req.user.
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

    const user = await User.findByPk(payload.sub);
    if (!user) {
      return res.status(401).json({ message: 'Usuário não encontrado.' });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
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

module.exports = { authenticate, authorize };
