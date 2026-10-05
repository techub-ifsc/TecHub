const { describe, test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = randomBytes(48).toString('hex');
process.env.JWT_EXPIRES_IN = '1d';
process.env.CLOUDINARY_CLOUD_NAME = 'techub-test';
process.env.CLOUDINARY_API_KEY = 'test-key';
process.env.CLOUDINARY_API_SECRET = 'test-secret';

const express = require('express');
const sequelize = require('../src/config/database');
const User = require('../src/models/User');
const Project = require('../src/models/Project');
const ProjectMedia = require('../src/models/ProjectMedia');
const ProjectTechnology = require('../src/models/ProjectTechnology');
const ProjectCollaborator = require('../src/models/ProjectCollaborator');
const { errorHandler } = require('../src/middlewares/errorHandler');
const { signToken } = require('../src/utils/jwt');

const projectId = '11111111-1111-4111-8111-111111111111';
const ownerId = '22222222-2222-4222-8222-222222222222';
const collaboratorId = '33333333-3333-4333-8333-333333333333';
const outsiderId = '44444444-4444-4444-8444-444444444444';
const imageUrl = (n) => `https://res.cloudinary.com/techub-test/image/upload/v1700000000/techub/projects/media_${1700000000000 + n}_ab12cd34ef56ab78.webp`;

describe('edição e exclusão de projetos', () => {
  let server;
  let baseUrl;
  let project;
  let media;
  let technologies;
  let collaborators;
  let mediaDeletes;

  beforeEach(async (t) => {
    project = { id: projectId, ownerId, title: 'Projeto original', description: 'Descrição original', status: 'Em desenvolvimento' };
    media = [{ id: 'media-1', projectId, url: imageUrl(1), mediaType: 'image', isCover: true }];
    technologies = ['React'];
    collaborators = [{ projectId, userId: collaboratorId, contribution: null }];
    mediaDeletes = 0;

    t.mock.method(sequelize, 'transaction', async (callback) => callback({ LOCK: { UPDATE: 'UPDATE' } }));
    t.mock.method(User, 'findByPk', async (id) => (
      [ownerId, collaboratorId, outsiderId].includes(id) ? { id, role: 'creator' } : null
    ));
    t.mock.method(User, 'findAll', async () => [{ id: collaboratorId, name: 'Colega' }]);
    t.mock.method(Project, 'findByPk', async (id) => {
      if (!project || id !== projectId) return null;
      return {
        id: project.id,
        ownerId: project.ownerId,
        update: async (data) => Object.assign(project, data),
        destroy: async () => { project = null; },
        toJSON: () => ({
          ...project,
          technologies: technologies.map((name) => ({ name })),
          collaborators: [...collaborators],
          media: [...media],
        }),
      };
    });
    t.mock.method(ProjectMedia, 'destroy', async () => { mediaDeletes += 1; media = []; });
    t.mock.method(ProjectMedia, 'bulkCreate', async (items) => {
      media = items.map((item, index) => ({ id: `media-${index + 2}`, ...item }));
      return media;
    });
    t.mock.method(ProjectTechnology, 'destroy', async () => { technologies = []; });
    t.mock.method(ProjectTechnology, 'bulkCreate', async (items) => { technologies = items.map((item) => item.name); });
    t.mock.method(ProjectCollaborator, 'findOne', async ({ where }) => (
      collaborators.find((item) => item.projectId === where.projectId && item.userId === where.userId) || null
    ));
    t.mock.method(ProjectCollaborator, 'destroy', async () => { collaborators = []; });
    t.mock.method(ProjectCollaborator, 'bulkCreate', async (items) => { collaborators = items; });

    const app = express();
    app.use(express.json());
    app.use('/api/projects', require('../src/routes/projectRoutes'));
    app.use(errorHandler);
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}/api/projects/${projectId}`;
  });

  afterEach(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });

  function request(method, userId, body) {
    return fetch(baseUrl, {
      method,
      headers: {
        ...(userId ? { Authorization: `Bearer ${signToken({ sub: userId })}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  }

  test('edita texto sem apagar as mídias existentes', async () => {
    const response = await request('PUT', ownerId, { title: 'Novo título' });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).project.media[0].url, imageUrl(1));
    assert.equal(project.title, 'Novo título');
    assert.equal(mediaDeletes, 0);
  });

  test('substitui a lista de mídias e troca a capa', async () => {
    const response = await request('PUT', ownerId, {
      media: [
        { url: imageUrl(1), mediaType: 'image' },
        { url: imageUrl(2), mediaType: 'image', isCover: true },
      ],
    });
    assert.equal(response.status, 200);
    assert.equal(mediaDeletes, 1);
    assert.deepEqual(media.map((item) => item.isCover), [false, true]);
    assert.equal((await response.json()).project.media.length, 2);
  });

  test('recusa galeria vazia sem modificar registros', async () => {
    const response = await request('PUT', ownerId, { media: [] });
    assert.equal(response.status, 400);
    assert.equal(mediaDeletes, 0);
    assert.equal(media.length, 1);
  });

  test('recusa URL de mídia inválida sem modificar a galeria', async () => {
    const response = await request('PUT', ownerId, {
      media: [{ url: 'https://outro-site.example/imagem.webp', mediaType: 'image' }],
    });
    assert.equal(response.status, 400);
    assert.equal(mediaDeletes, 0);
  });

  test('colaborador edita conteúdo, mas não a lista de colaboradores', async () => {
    const edit = await request('PUT', collaboratorId, { description: 'Descrição atualizada' });
    assert.equal(edit.status, 200);
    assert.equal(project.description, 'Descrição atualizada');
    const gallery = await request('PUT', collaboratorId, {
      media: [{ url: imageUrl(2), mediaType: 'image' }],
    });
    assert.equal(gallery.status, 200);
    assert.equal(media[0].url, imageUrl(2));
    const manage = await request('PUT', collaboratorId, { collaborators: [] });
    assert.equal(manage.status, 403);
    assert.equal(collaborators.length, 1);
  });

  test('usuário sem vínculo não edita nem exclui', async () => {
    assert.equal((await request('PUT', outsiderId, { title: 'Invadido' })).status, 403);
    assert.equal((await request('DELETE', outsiderId)).status, 403);
    assert.ok(project);
  });

  test('colaborador não exclui', async () => {
    assert.equal((await request('DELETE', collaboratorId)).status, 403);
    assert.ok(project);
  });

  test('dono exclui projeto, mídias e demais relações', async () => {
    const response = await request('DELETE', ownerId);
    assert.equal(response.status, 200);
    assert.equal(project, null);
    assert.deepEqual(media, []);
    assert.deepEqual(technologies, []);
    assert.deepEqual(collaborators, []);
    assert.equal((await request('GET')).status, 404);
  });

  test('detalhe devolve mídias e nomes reais dos colaboradores', async () => {
    const response = await request('GET');
    assert.equal(response.status, 200);
    const { project: result } = await response.json();
    assert.equal(result.media[0].url, imageUrl(1));
    assert.equal(result.collaborators[0].name, 'Colega');
  });

  test('busca colaboradores reais com autenticação', async () => {
    const searchUrl = baseUrl.replace(projectId, 'collaborators/search?q=Co');
    const unauthorized = await fetch(searchUrl);
    assert.equal(unauthorized.status, 401);
    const response = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${signToken({ sub: ownerId })}` },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { users: [{ id: collaboratorId, name: 'Colega' }] });
  });

  test('exige autenticação e responde 404 para projeto inexistente', async () => {
    assert.equal((await request('DELETE')).status, 401);
    project = null;
    assert.equal((await request('PUT', ownerId, { title: 'Nada' })).status, 404);
    assert.equal((await request('DELETE', ownerId)).status, 404);
  });
});
