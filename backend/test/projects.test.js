const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes, randomUUID } = require('node:crypto');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = randomBytes(48).toString('hex');
process.env.JWT_EXPIRES_IN = '1d';
process.env.CLOUDINARY_CLOUD_NAME = 'techub-test';

const express = require('express');
const sequelize = require('../src/config/database');
const { User } = require('../src/models');
const Project = require('../src/models/Project');
const ProjectMedia = require('../src/models/ProjectMedia');
const ProjectTechnology = require('../src/models/ProjectTechnology');
const ProjectCollaborator = require('../src/models/ProjectCollaborator');
const { errorHandler } = require('../src/middlewares/errorHandler');
const { signToken } = require('../src/utils/jwt');

const imageUrl = (n) =>
  `https://res.cloudinary.com/techub-test/image/upload/v1700000000/techub/projects/media_${1700000000000 + n}_ab12cd34ef56ab78.webp`;

// Banco simulado: as rotas, middlewares, validadores e controllers são reais.
describe('rotas de projetos', () => {
  let server;
  let baseUrl;
  let users;
  let calls;

  beforeEach(async (t) => {
    users = new Map();
    calls = { mediaDestroy: [], mediaCreate: [], projectCreate: 0 };

    t.mock.method(User, 'findByPk', async (id) => users.get(id) || null);
    t.mock.method(sequelize, 'transaction', async () => ({ commit: async () => {}, rollback: async () => {} }));
    t.mock.method(Project, 'create', async (data) => {
      calls.projectCreate += 1;
      return Project.build({ ...data, id: randomUUID() });
    });
    t.mock.method(ProjectTechnology, 'destroy', async () => 0);
    t.mock.method(ProjectTechnology, 'bulkCreate', async () => []);
    t.mock.method(ProjectCollaborator, 'destroy', async () => 0);
    t.mock.method(ProjectMedia, 'destroy', async (options) => calls.mediaDestroy.push(options.where));
    t.mock.method(ProjectMedia, 'bulkCreate', async (records) => {
      calls.mediaCreate.push(records);
      return records.map((r) => ProjectMedia.build({ ...r, id: randomUUID() }));
    });

    delete require.cache[require.resolve('../src/routes/projectRoutes')];
    const app = express();
    app.use(express.json());
    app.use('/api/projects', require('../src/routes/projectRoutes'));
    app.use(errorHandler);
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}/api/projects`;
  });

  afterEach(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });

  function createUser(role) {
    const user = User.build({ name: role, email: `${role}@ifsc.edu.br`, password: 'x', role });
    users.set(user.id, user);
    return user;
  }

  function request(method, path, user, body) {
    return fetch(baseUrl + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(user && { Authorization: `Bearer ${signToken({ sub: user.id, role: user.role })}` }),
      },
      body: body && JSON.stringify(body),
    });
  }

  const validProject = {
    title: 'Projeto teste',
    description: 'Descrição do projeto teste',
    media: [{ url: 'https://youtu.be/dQw4w9WgXcQ', mediaType: 'video' }],
  };

  test('visitante não pode cadastrar projeto, nem só com link do YouTube', async () => {
    const res = await request('POST', '/', createUser('visitor'), validProject);
    assert.equal(res.status, 403);
    assert.equal(calls.projectCreate, 0);
  });

  test('criador cadastra projeto com mídia', async () => {
    const res = await request('POST', '/', createUser('creator'), validProject);
    assert.equal(res.status, 201);
    assert.equal(calls.mediaCreate[0][0].url, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });

  test('visitante não pode editar projeto', async () => {
    const res = await request('PUT', `/${randomUUID()}`, createUser('visitor'), { title: 'Novo título' });
    assert.equal(res.status, 403);
  });

  describe('edição de mídias', () => {
    let owner;
    let project;

    beforeEach((t) => {
      owner = createUser('creator');
      project = Project.build({ id: randomUUID(), title: 'Antigo', ownerId: owner.id });
      t.mock.method(project, 'update', async () => project);
      t.mock.method(Project, 'findByPk', async () => project);
    });

    test('substitui as mídias quando a lista é enviada', async () => {
      const res = await request('PUT', `/${project.id}`, owner, {
        media: [
          { url: imageUrl(1), mediaType: 'image' },
          { url: imageUrl(2), mediaType: 'image', isCover: true },
        ],
      });
      assert.equal(res.status, 200);
      assert.deepEqual(calls.mediaDestroy, [{ projectId: project.id }]);
      assert.deepEqual(
        calls.mediaCreate[0].map(({ url, isCover, projectId }) => ({ url, isCover, projectId })),
        [
          { url: imageUrl(1), isCover: false, projectId: project.id },
          { url: imageUrl(2), isCover: true, projectId: project.id },
        ]
      );
    });

    test('mantém as mídias quando o campo não é enviado', async () => {
      const res = await request('PUT', `/${project.id}`, owner, { title: 'Novo título' });
      assert.equal(res.status, 200);
      assert.equal(calls.mediaDestroy.length, 0);
      assert.equal(calls.mediaCreate.length, 0);
    });

    test('não permite remover todas as mídias', async () => {
      const res = await request('PUT', `/${project.id}`, owner, { media: [] });
      assert.equal(res.status, 400);
      assert.equal(calls.mediaDestroy.length, 0);
    });

    test('não aceita URL de fora da plataforma', async () => {
      const res = await request('PUT', `/${project.id}`, owner, {
        media: [{ url: 'https://evil.example.com/a.webp', mediaType: 'image' }],
      });
      assert.equal(res.status, 400);
      assert.equal(calls.mediaDestroy.length, 0);
    });

    test('outro criador não pode editar as mídias', async () => {
      const res = await request('PUT', `/${project.id}`, createUser('creator'), {
        media: [{ url: imageUrl(1), mediaType: 'image' }],
      });
      assert.equal(res.status, 403);
      assert.equal(calls.mediaDestroy.length, 0);
    });
  });

  test('recusa links externos que não sejam http(s)', async () => {
    const creator = createUser('creator');
    for (const link of ['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>']) {
      const res = await request('POST', '/', creator, { ...validProject, githubURL: link, liveURL: link });
      assert.equal(res.status, 400);
    }
    assert.equal(calls.projectCreate, 0);
  });

  test('detalhe do projeto traz o nome do autor sem o e-mail', async (t) => {
    let options;
    t.mock.method(Project, 'findByPk', async (id, opts) => {
      options = opts;
      return Project.build({ id, title: 'Projeto' });
    });

    const res = await request('GET', `/${randomUUID()}`);
    assert.equal(res.status, 200);
    const author = options.include.find((i) => i.as === 'author');
    assert.deepEqual(author.attributes, ['id', 'name']);
  });

  test('listagem devolve a URL da capa (ou null) em coverUrl', async (t) => {
    const withCover = Project.build(
      { id: randomUUID(), title: 'Com capa', media: [{ url: imageUrl(1) }] },
      { include: [{ model: ProjectMedia, as: 'media' }] }
    );
    const withoutCover = Project.build(
      { id: randomUUID(), title: 'Só vídeo', media: [] },
      { include: [{ model: ProjectMedia, as: 'media' }] }
    );
    let options;
    t.mock.method(Project, 'findAndCountAll', async (opts) => {
      options = opts;
      return { count: 2, rows: [withCover, withoutCover] };
    });

    const res = await request('GET', '/');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body.projects.map((p) => p.coverUrl), [imageUrl(1), null]);
    assert.equal(body.projects[0].media, undefined);

    const mediaInclude = options.include.find((i) => i.as === 'media');
    assert.deepEqual(mediaInclude.where, { isCover: true });
    assert.equal(mediaInclude.required, false);
  });
});
