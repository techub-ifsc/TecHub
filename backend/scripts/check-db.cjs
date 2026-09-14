// Somente leitura. Não exibe credenciais, tokens, hashes ou dados pessoais.
const sequelize = require('../src/config/database');
async function main() {
  try {
    if (sequelize.getDialect() !== 'postgres') throw new Error('EXPECTED_POSTGRES');
    await sequelize.authenticate();
    const [ssl] = await sequelize.query('SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()');
    const [columns] = await sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='users'");
    const expected = ['id', 'name', 'email', 'password', 'role', 'created_at', 'updated_at'];
    if (expected.some(name => !columns.some(c => c.column_name === name))) throw new Error('USERS_SCHEMA_INCOMPLETE');
    const [roles] = await sequelize.query("SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE t.typname='enum_users_role' AND n.nspname='public'");
    if (roles.length !== 2 || !['customer', 'seller'].every(role => roles.some(r => r.enumlabel === role))) throw new Error('ROLES_INCOMPLETE');
    const [migrations] = await sequelize.query('SELECT name FROM public."SequelizeMeta" ORDER BY name');
    console.log('Conexão PostgreSQL: OK');
    console.log(`SSL da sessão: ${ssl[0]?.ssl === true ? 'ATIVO' : 'NÃO CONFIRMADO'}`);
    console.log('Colunas de users: OK');
    console.log('Perfis customer (Visitante) e seller (Criador): OK');
    console.log(`Migrations registradas: ${migrations.length}`);
  } catch (error) {
    const allowed = ['EXPECTED_POSTGRES', 'USERS_SCHEMA_INCOMPLETE', 'ROLES_INCOMPLETE'];
    console.error('Verificação falhou:', allowed.includes(error.message) ? error.message : 'Confira ambiente, certificado, conexão e migrations.');
    process.exitCode = 1;
  } finally { await sequelize.close(); }
}
main();
