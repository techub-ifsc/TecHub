const path = require('path');
const fs = require('fs');

// O mesmo arquivo é usado pela API e pelo Sequelize CLI, independentemente do terminal.
const backendRoot = path.resolve(__dirname, '../..');
require('dotenv').config({ path: path.join(backendRoot, '.env') });

function required(name) {
  const value = process.env[name];
  if (!value || !value.trim()) throw new Error(`Defina ${name} no ambiente do backend.`);
  return value;
}
function boolean(name, fallback) {
  if (process.env[name] === undefined || process.env[name] === '') return fallback;
  if (process.env[name] === 'true') return true;
  if (process.env[name] === 'false') return false;
  throw new Error(`${name} deve ser true ou false.`);
}
const dialect = process.env.DB_DIALECT || 'postgres';
const port = Number(process.env.DB_PORT || (dialect === 'mysql' ? 3306 : 5432));
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('DB_PORT inválida.');
const base = {
  username: required('DB_USER'),
  password: required('DB_PASSWORD'),
  database: required('DB_NAME'),
  host: required('DB_HOST'),
  port,
  dialect,
  logging: false,
};
function configuration(production) {
  if (!boolean('DB_SSL', production)) return { ...base };
  const ssl = { require: true, rejectUnauthorized: true };
  if (process.env.DB_SSL_CA_FILE) {
    try {
      ssl.ca = fs.readFileSync(path.resolve(backendRoot, process.env.DB_SSL_CA_FILE), 'utf8');
    } catch {
      throw new Error('Não foi possível ler o certificado indicado em DB_SSL_CA_FILE.');
    }
  }
  return { ...base, dialectOptions: { ssl } };
}
module.exports = {
  development: configuration(false),
  test: { ...configuration(false), database: process.env.DB_TEST_NAME || `${base.database}_test` },
  production: configuration(true),
};
