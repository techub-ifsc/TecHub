const { Op } = require('sequelize');
const sequelize = require('../config/database');

// O PostgreSQL possui um operador LIKE próprio que ignora maiúsculas e minúsculas.
// MySQL e MariaDB não aceitam Op.iLike e utilizam a configuração padrão de texto,
// na qual um LIKE comum já apresenta o mesmo comportamento.
// Escolhe o operador de busca textual compatível com o banco configurado.
function likeOperator() {
  return sequelize.getDialect() === 'postgres' ? Op.iLike : Op.like;
}

// Padrão "contém" para o LIKE com o texto da pessoa tratado como literal: sem o escape,
// % e _ digitados viram curingas (buscar "%" devolvia todos os registros).
// A barra é o caractere de escape padrão do LIKE no PostgreSQL e no MySQL.
function containsPattern(text) {
  return `%${String(text).replace(/[\\%_]/g, '\\$&')}%`;
}

module.exports = { likeOperator, containsPattern };
