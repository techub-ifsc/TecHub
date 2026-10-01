const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = randomBytes(48).toString('hex');
process.env.JWT_EXPIRES_IN = '1d';
process.env.CREATOR_ALLOWED_DOMAINS = '@ifsc.edu.br,@aluno.ifsc.edu.br';

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../src/models');
const { errorHandler } = require('../src/middlewares/errorHandler');
const { authorize } = require('../src/middlewares/auth');
const { ROLES } = require('../src/constants/roles');

let server;
let baseUrl;
let rows;

// Banco simulado somente nos testes. A aplicação continua usando Sequelize.
// O model, o hook bcrypt, os controllers, os validadores e o middleware são reais.
beforeEach(async (t) => {
  rows = new Map();
  t.mock.method(User, 'findOne', async ({ where }) =>
    [...rows.values()].find((user) => user.email === where.email) || null);
  t.mock.method(User, 'findByPk', async (id) => rows.get(id) || null);
  t.mock.method(User, 'create', async (data) => {
    const user = User.build(data);
    await user.validate();
    await User.runHooks('beforeSave', user, {});
    rows.set(user.id, user);
    return user;
  });
  t.mock.method(User.prototype, 'save', async function save() {
    await User.runHooks('beforeSave', this, {});
    rows.set(this.id, this);
    return this;
  });

  // Cada teste recebe um rate limiter novo para evitar dependência entre testes.
  delete require.cache[require.resolve('../src/routes/authRoutes')];
  const app = express();
  app.use(express.json());
  app.use('/api/auth', require('../src/routes/authRoutes'));
  app.use(errorHandler);
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  baseUrl = 'http://127.0.0.1:' + server.address().port + '/api/auth';
});

afterEach(async (t) => {
  if (server) {
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  }
  t.mock.restoreAll();
});

const account = () => ({
  name: 'Maria Silva',
  email: 'maria@example.com',
  password: 'SenhaTeste123',
  accountType: 'visitor',
});

async function request(path, body, token, method) {
  const response = await fetch(baseUrl + path, {
    method: method || (body === undefined ? 'GET' : 'POST'),
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json(), headers: response.headers };
}

test('cadastro grava perfil e hash bcrypt; login retorna usuario seguro com JWT', async () => {
  const input = { ...account(), name: ' Maria Silva ', email: ' MARIA@EXAMPLE.COM ' };
  const result = await request('/register', input);
  assert.equal(result.status, 201);
  assert.equal(result.body.user.name, 'Maria Silva');
  assert.equal(result.body.user.email, 'maria@example.com');
  assert.equal(result.body.user.role, 'visitor');
  assert.equal(Object.hasOwn(result.body.user, 'password'), false);
  const stored = rows.get(result.body.user.id);
  assert.notEqual(stored.password, input.password);
  assert.equal(bcrypt.getRounds(stored.password), 12);
  assert.equal(await bcrypt.compare(input.password, stored.password), true);
  // A main responde o cadastro com mensagem; a sessão é obtida pelo login.
  assert.equal(Object.hasOwn(result.body, 'token'), false);
  const login = await request('/login', { email: input.email, password: input.password });
  const payload = jwt.verify(login.body.token, process.env.JWT_SECRET);
  assert.equal(payload.sub, stored.id);
  assert.equal(payload.role, 'visitor');
  assert.equal(payload.exp - payload.iat, 86400);
  assert.equal(Object.hasOwn(payload, 'password'), false);
});

test('cadastro duplicado normaliza caixa e retorna 409', async () => {
  await request('/register', account());
  const result = await request('/register', { ...account(), email: 'MARIA@example.com' });
  assert.equal(result.status, 409);
  assert.equal(rows.size, 1);
});

test('violacao de unicidade retornada pelo banco simulado vira 409', async (t) => {
  t.mock.method(User, 'create', async () => {
    const error = new Error('SQL e dados privados nao podem sair na resposta');
    error.name = 'SequelizeUniqueConstraintError';
    throw error;
  });
  const result = await request('/register', account());
  assert.equal(result.status, 409);
  assert.equal(result.body.message, 'Já existe uma conta com este e-mail.');
});

test('API rejeita nome ausente, email invalido e senhas fora da politica', async () => {
  const invalid = [
    { name: '' }, { name: 'a'.repeat(101) }, { email: 'invalido' },
    { password: 'Abc1234' }, { password: 'abcdefgh' }, { password: '12345678' },
    { password: 'a1' + 'a'.repeat(71) }, { password: 'a1' + 'é'.repeat(36) },
    { password: 12345678 },
  ];
  for (const fields of invalid) {
    const result = await request('/register', { ...account(), ...fields });
    assert.equal(result.status, 400);
    assert.equal(result.body.message, 'Dados inválidos.');
    assert.ok(Array.isArray(result.body.errors));
  }
  const missing = await request('/register', { email: 'maria@example.com', password: 'SenhaTeste123' });
  assert.equal(missing.status, 400);
  assert.equal(rows.size, 0);
});

test('cadastro aceita letras acentuadas e o limite exato de 72 bytes', async () => {
  const password = 'é1' + 'a'.repeat(69);
  const result = await request('/register', { ...account(), password });
  assert.equal(result.status, 201);
  assert.equal(Buffer.byteLength(password), 72);
});

test('cadastro de creator aceita os dominios institucionais configurados', async () => {
  const creator = await request('/register', {
    ...account(),
    email: ' MARIA@IFSC.EDU.BR ',
    accountType: 'creator',
  });
  assert.equal(creator.status, 201);
  assert.equal(creator.body.user.email, 'maria@ifsc.edu.br');
  assert.equal(creator.body.user.role, 'creator');

  const external = await request('/register', {
    ...account(),
    email: 'criador@example.com',
    accountType: 'creator',
  });
  assert.equal(external.status, 400);
  assert.equal(external.body.message, 'Dados inválidos.');

  const student = await request('/register', {
    ...account(),
    email: 'criador@aluno.ifsc.edu.br',
    accountType: 'creator',
  });
  assert.equal(student.status, 201);
  assert.equal(student.body.user.role, 'creator');

  const unknownSubdomain = await request('/register', {
    ...account(),
    email: 'criador@outro.ifsc.edu.br',
    accountType: 'creator',
  });
  assert.equal(unknownSubdomain.status, 400);
});

test('cadastro publico nao aceita role, super_admin ou campos estranhos', async () => {
  for (const role of ['customer', 'seller', 'visitor', 'creator', 'admin', 'super_admin']) {
    const result = await request('/register', { ...account(), role });
    assert.equal(result.status, 400);
  }
  for (const accountType of ['customer', 'seller', 'admin', 'super_admin', 'student']) {
    const result = await request('/register', { ...account(), accountType });
    assert.equal(result.status, 400);
  }
  assert.equal((await request('/register', { ...account(), username: 'maria' })).status, 400);
  assert.equal(rows.size, 0);
});

test('creator nao pode trocar o perfil para email fora do dominio institucional', async () => {
  const registered = await request('/register', {
    ...account(),
    email: 'maria@ifsc.edu.br',
    accountType: 'creator',
  });
  const login = await request('/login', {
    email: 'maria@ifsc.edu.br',
    password: account().password,
  });
  const result = await request(
    '/me',
    { email: 'maria@example.com', currentPassword: account().password },
    login.body.token,
    'PATCH'
  );
  assert.equal(result.status, 400);
  assert.match(result.body.message, /domínios institucionais/);
});

test('super_admin passa pelas autorizacoes de perfil, mas visitor nao', () => {
  const run = (role) => {
    let nextCalled = false;
    let status;
    authorize(ROLES.CREATOR)(
      { user: { role } },
      { status(code) { status = code; return this; }, json() {} },
      () => { nextCalled = true; }
    );
    return { nextCalled, status };
  };

  assert.deepEqual(run(ROLES.CREATOR), { nextCalled: true, status: undefined });
  assert.deepEqual(run(ROLES.SUPER_ADMIN), { nextCalled: true, status: undefined });
  assert.deepEqual(run(ROLES.VISITOR), { nextCalled: false, status: 403 });
});

test('login autentica, aceita email normalizado e permite consultar /me', async () => {
  const registered = await request('/register', account());
  const result = await request('/login', { email: ' MARIA@EXAMPLE.COM ', password: account().password });
  assert.equal(result.status, 200);
  assert.equal(result.body.user.id, registered.body.user.id);
  const me = await request('/me', undefined, result.body.token);
  assert.equal(me.status, 200);
  assert.equal(me.body.user.id, registered.body.user.id);
  assert.equal(Object.hasOwn(me.body.user, 'password'), false);
});

test('login responde o mesmo 401 para usuario inexistente e senha errada', async () => {
  await request('/register', account());
  const wrong = await request('/login', { email: account().email, password: 'errada' });
  const absent = await request('/login', { email: 'ausente@example.com', password: 'errada' });
  assert.equal(wrong.status, 401);
  assert.equal(absent.status, 401);
  assert.deepEqual(wrong.body, absent.body);
  assert.equal(wrong.body.message, 'E-mail ou senha inválidos.');
});

test('senha nao e aparada: espacos fazem parte da credencial', async () => {
  await request('/register', { ...account(), password: ' SenhaTeste123 ' });
  assert.equal((await request('/login', { email: account().email, password: 'SenhaTeste123' })).status, 401);
  assert.equal((await request('/login', { email: account().email, password: ' SenhaTeste123 ' })).status, 200);
});

test('login rejeita email malformado e senha ausente', async () => {
  assert.equal((await request('/login', { email: 'invalido', password: 'x' })).status, 400);
  assert.equal((await request('/login', { email: account().email })).status, 400);
});

test('/me rejeita token ausente, invalido, expirado e usuario inexistente', async () => {
  const registered = await request('/register', account());
  assert.equal((await request('/me')).status, 401);
  assert.equal((await request('/me', undefined, 'token-invalido')).status, 401);
  const expired = jwt.sign({ sub: registered.body.user.id }, process.env.JWT_SECRET, { expiresIn: -1 });
  assert.equal((await request('/me', undefined, expired)).status, 401);
  rows.clear();
  assert.equal((await request('/me', undefined, registered.body.token)).status, 401);
});

test('banco indisponivel ou tabela ausente retorna 503 sem detalhes internos', async (t) => {
  for (const name of ['SequelizeConnectionRefusedError', 'SequelizeDatabaseError']) {
    t.mock.method(User, 'findOne', async () => {
      const error = new Error('SQL com credenciais privadas');
      error.name = name;
      throw error;
    });
    for (const path of ['/register', '/login']) {
      const result = await request(path, account());
      assert.equal(result.status, 503);
      assert.deepEqual(result.body, { message: 'Serviço de contas indisponível. Tente novamente mais tarde.' });
    }
  }
});

test('rate limiter herdado bloqueia a 21a requisicao por IP', async () => {
  for (let i = 0; i < 20; i++) {
    assert.equal((await request('/login', { email: 'ausente@example.com', password: 'errada' })).status, 401);
  }
  const result = await request('/login', { email: 'ausente@example.com', password: 'errada' });
  assert.equal(result.status, 429);
  assert.ok(result.headers.has('retry-after'));
});
