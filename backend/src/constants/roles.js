// Valores persistidos no banco e usados no JWT. Centralizar evita que rotas
// diferentes usem nomes antigos ou grafias incompatíveis.
const ROLES = Object.freeze({
  VISITOR: 'visitor',
  CREATOR: 'creator',
  SUPER_ADMIN: 'super_admin',
});

// Somente estes dois perfis podem ser escolhidos no cadastro público.
const PUBLIC_ACCOUNT_TYPES = Object.freeze([ROLES.VISITOR, ROLES.CREATOR]);

module.exports = { ROLES, PUBLIC_ACCOUNT_TYPES };
