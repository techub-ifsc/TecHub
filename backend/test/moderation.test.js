const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes, randomUUID } = require('node:crypto');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = randomBytes(48).toString('hex');
process.env.JWT_EXPIRES_IN = '1d';
process.env.CLOUDINARY_CLOUD_NAME = 'techub-test';
process.env.CLOUDINARY_API_KEY = 'test-key';
process.env.CLOUDINARY_API_SECRET = 'test-secret';
process.env.MODERATION_SLA_DAYS = '3';

const express = require('express');
const { Op } = require('sequelize');
const sequelize = require('../src/config/database');
const { User } = require('../src/models');
const Project = require('../src/models/Project');
const ProjectMedia = require('../src/models/ProjectMedia');
const ProjectTechnology = require('../src/models/ProjectTechnology');
const ProjectCollaborator = require('../src/models/ProjectCollaborator');
const { errorHandler } = require('../src/middlewares/errorHandler');
const { signToken } = require('../src/utils/jwt');
const { getModerationSlaDays, getReviewDueDate } = require('../src/config/moderation');

const DAY_IN_MS = 24 * 60 * 60 * 1000;

// Banco simulado: as rotas, middlewares, validadores e controllers são reais.
describe('moderação de projetos', () => {
  let server;
  let baseUrl;
  let users;
  let projects;
  let calls;

  beforeEach(async (t) => {
    users = new Map();
    projects = new Map();
    calls = { findAll: [], count: [], update: [], create: [] };

    t.mock.method(User, 'findByPk', async (id) => users.get(id) || null);
    t.mock.method(User, 'findAll', async ({ where }) =>
      [].concat(where.id).map((id) => users.get(id)).filter(Boolean)
    );
    t.mock.method(sequelize, 'transaction', async (callback) => {
      const transaction = { LOCK: { UPDATE: 'UPDATE' }, commit: async () => {}, rollback: async () => {} };
      return typeof callback === 'function' ? callback(transaction) : transaction;
    });
    t.mock.method(Project, 'findByPk', async (id) => projects.get(id) || null);
    t.mock.method(Project, 'findAll', async (options) => {
      calls.findAll.push(options);
      return [...projects.values()];
    });
    t.mock.method(Project, 'findAndCountAll', async (options) => {
      calls.findAll.push(options);
      return { count: projects.size, rows: [...projects.values()] };
    });
    t.mock.method(Project, 'count', async ({ where }) => {
      calls.count.push(where);
      return [...projects.values()].filter((p) => p.approvalStatus === where.approvalStatus).length;
    });
    t.mock.method(Project, 'create', async (data) => {
      calls.create.push(data);
      return Project.build({ ...data, id: randomUUID() });
    });
    t.mock.method(ProjectTechnology, 'destroy', async () => 0);
    t.mock.method(ProjectTechnology, 'bulkCreate', async () => []);
    t.mock.method(ProjectCollaborator, 'destroy', async () => 0);
    t.mock.method(ProjectCollaborator, 'bulkCreate', async () => []);
    t.mock.method(ProjectCollaborator, 'findOne', async () => null);
    t.mock.method(ProjectCollaborator, 'findAll', async () => []);
    t.mock.method(ProjectMedia, 'destroy', async () => 0);
    t.mock.method(ProjectMedia, 'bulkCreate', async (records) =>
      records.map((r) => ProjectMedia.build({ ...r, id: randomUUID() }))
    );

    const app = express();
    app.use(express.json());
    app.use('/api/admin', require('../src/routes/adminRoutes'));
    app.use('/api/projects', require('../src/routes/projectRoutes'));
    app.use(errorHandler);
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  });

  afterEach(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });

  function createUser(role, name = role) {
    const user = User.build({ name, email: `${randomUUID()}@ifsc.edu.br`, password: 'x', role, emailVerifiedAt: new Date() });
    users.set(user.id, user);
    return user;
  }

  // Projeto em memória; update() aplica os dados como o Sequelize faria.
  function createProject(t, data = {}, collaborators = []) {
    const project = Project.build(
      {
        id: randomUUID(),
        title: 'Projeto em análise',
        ownerId: createUser('creator', 'Autora').id,
        collaborators: collaborators.map((user) => ({ userId: user.id, contribution: null })),
        ...data,
      },
      { include: [{ model: ProjectCollaborator, as: 'collaborators' }] }
    );
    t.mock.method(project, 'update', async (values) => {
      calls.update.push(values);
      project.set(values);
      return project;
    });
    projects.set(project.id, project);
    return project;
  }

  function request(method, path, user, body) {
    const token = typeof user === 'string' ? user : user && signToken({ sub: user.id, role: user.role });
    return fetch(baseUrl + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body && JSON.stringify(body),
    });
  }

  const adminRoutes = (id) => [
    ['GET', '/admin/projects/pending'],
    ['GET', '/admin/projects'],
    ['PATCH', `/admin/projects/${id}/approve`, { reviewNotes: 'Tudo certo.' }],
    ['PATCH', `/admin/projects/${id}/reject`, { reviewNotes: 'Faltou a descrição.' }],
  ];

  describe('acesso à área administrativa', () => {
    test('sem token ou com token inválido, nenhuma rota responde', async (t) => {
      const project = createProject(t);
      for (const [method, path, body] of adminRoutes(project.id)) {
        assert.equal((await request(method, path, null, body)).status, 401, `${method} ${path}`);
        assert.equal((await request(method, path, 'token-falso', body)).status, 401, `${method} ${path}`);
      }
      assert.equal(calls.findAll.length, 0);
      assert.equal(calls.update.length, 0);
    });

    test('visitante e criador não listam nem alteram a situação de um projeto', async (t) => {
      const project = createProject(t);
      for (const role of ['visitor', 'creator']) {
        const user = createUser(role);
        for (const [method, path, body] of adminRoutes(project.id)) {
          assert.equal((await request(method, path, user, body)).status, 403, `${role}: ${method} ${path}`);
        }
      }
      assert.equal(calls.findAll.length, 0);
      assert.equal(calls.update.length, 0);
      assert.equal(project.approvalStatus, 'pending');
    });

    test('o dono do projeto não consegue aprovar o próprio projeto', async (t) => {
      const project = createProject(t);
      const owner = users.get(project.ownerId);
      assert.equal((await request('PATCH', `/admin/projects/${project.id}/approve`, owner)).status, 403);
      assert.equal(project.approvalStatus, 'pending');
    });
  });

  describe('fila de moderação', () => {
    test('super_admin lista os pendentes com o prazo de análise', async (t) => {
      const admin = createUser('super_admin');
      const collaborator = createUser('creator', 'Colega');
      const submittedAt = new Date('2026-10-10T12:00:00.000Z');
      const project = createProject(t, { submittedAt }, [collaborator]);

      const res = await request('GET', '/admin/projects/pending', admin);
      assert.equal(res.status, 200);
      const body = await res.json();

      const [options] = calls.findAll;
      assert.deepEqual(options.where, { approvalStatus: 'pending' });
      assert.deepEqual(options.order, [['submitted_at', 'ASC']]);

      assert.equal(body.slaDays, 3);
      assert.deepEqual(body.totals, { pending: 1, approved: 0, rejected: 0 });
      assert.equal(body.projects.length, 1);
      assert.equal(body.projects[0].id, project.id);
      assert.equal(body.projects[0].approvalStatus, 'pending');
      assert.equal(body.projects[0].submittedAt, submittedAt.toISOString());
      assert.equal(body.projects[0].dueAt, '2026-10-13T12:00:00.000Z');
      assert.deepEqual(
        body.projects[0].collaborators.map(({ userId, name }) => ({ userId, name })),
        [{ userId: collaborator.id, name: 'Colega' }]
      );
    });

    test('filtra por situação e recusa uma situação desconhecida', async (t) => {
      const admin = createUser('super_admin');
      createProject(t, { approvalStatus: 'rejected', reviewNotes: 'Incompleto.' });

      assert.equal((await request('GET', '/admin/projects?status=rejected', admin)).status, 200);
      assert.deepEqual(calls.findAll[0].where, { approvalStatus: 'rejected' });
      assert.deepEqual(calls.findAll[0].order, [['submitted_at', 'DESC']]);

      const all = await request('GET', '/admin/projects', admin);
      assert.deepEqual(calls.findAll[1].where, { approvalStatus: { [Op.ne]: 'draft' } });
      assert.deepEqual((await all.json()).totals, { pending: 0, approved: 0, rejected: 1 });

      assert.equal((await request('GET', '/admin/projects?status=publicado', admin)).status, 400);
      assert.equal((await request('GET', '/admin/projects?status=draft', admin)).status, 400);
      assert.equal(calls.findAll.length, 2);
    });
  });

  describe('decisão da moderação', () => {
    test('aprovar grava a situação, a data da análise e o comentário opcional', async (t) => {
      const admin = createUser('super_admin');
      const withNotes = createProject(t);
      const withoutNotes = createProject(t);

      const before = Date.now();
      const res = await request('PATCH', `/admin/projects/${withNotes.id}/approve`, admin, {
        reviewNotes: '  Ótimo projeto!  ',
      });
      assert.equal(res.status, 200);
      const { project } = await res.json();
      assert.equal(project.approvalStatus, 'approved');
      assert.equal(project.reviewNotes, 'Ótimo projeto!');
      assert.ok(new Date(project.reviewedAt).getTime() >= before);
      assert.equal(withNotes.approvalStatus, 'approved');

      assert.equal((await request('PATCH', `/admin/projects/${withoutNotes.id}/approve`, admin)).status, 200);
      assert.equal(withoutNotes.approvalStatus, 'approved');
      assert.equal(withoutNotes.reviewNotes, null);
      assert.ok(withoutNotes.reviewedAt instanceof Date);
    });

    test('rejeitar sem justificativa é recusado e nada é salvo', async (t) => {
      const admin = createUser('super_admin');
      const project = createProject(t);

      for (const body of [undefined, {}, { reviewNotes: '' }, { reviewNotes: '   ' }, { reviewNotes: null }, { reviewNotes: 123 }]) {
        const res = await request('PATCH', `/admin/projects/${project.id}/reject`, admin, body);
        assert.equal(res.status, 400, JSON.stringify(body));
        assert.equal((await res.json()).errors[0].path, 'reviewNotes');
      }
      assert.equal(calls.update.length, 0);
      assert.equal(project.approvalStatus, 'pending');
    });

    test('rejeitar grava a justificativa que será exibida ao criador', async (t) => {
      const admin = createUser('super_admin');
      const project = createProject(t);

      const res = await request('PATCH', `/admin/projects/${project.id}/reject`, admin, {
        reviewNotes: 'Faltou descrever as tecnologias usadas.',
      });
      assert.equal(res.status, 200);
      assert.equal(calls.update.length, 1);
      assert.equal(calls.update[0].approvalStatus, 'rejected');
      assert.equal(calls.update[0].reviewNotes, 'Faltou descrever as tecnologias usadas.');
      assert.ok(calls.update[0].reviewedAt instanceof Date);
      assert.equal(project.reviewNotes, 'Faltou descrever as tecnologias usadas.');
    });

    test('parecer acima de 1000 caracteres é recusado', async (t) => {
      const admin = createUser('super_admin');
      const project = createProject(t);
      const reviewNotes = 'a'.repeat(1001);

      assert.equal((await request('PATCH', `/admin/projects/${project.id}/reject`, admin, { reviewNotes })).status, 400);
      assert.equal((await request('PATCH', `/admin/projects/${project.id}/approve`, admin, { reviewNotes })).status, 400);
      assert.equal(calls.update.length, 0);
    });

    test('rascunho não pode ser aprovado nem rejeitado', async (t) => {
      const admin = createUser('super_admin');
      const draft = createProject(t, { approvalStatus: 'draft' });

      assert.equal((await request('PATCH', `/admin/projects/${draft.id}/approve`, admin)).status, 400);
      assert.equal((await request('PATCH', `/admin/projects/${draft.id}/reject`, admin, { reviewNotes: 'Motivo.' })).status, 400);
      assert.equal(calls.update.length, 0);
      assert.equal(draft.approvalStatus, 'draft');
    });

    test('projeto inexistente ou id inválido responde 404', async () => {
      const admin = createUser('super_admin');
      const body = { reviewNotes: 'Motivo.' };
      for (const id of [randomUUID(), 'nao-e-uuid']) {
        assert.equal((await request('PATCH', `/admin/projects/${id}/approve`, admin)).status, 404);
        assert.equal((await request('PATCH', `/admin/projects/${id}/reject`, admin, body)).status, 404);
      }
    });
  });

  describe('visibilidade pública', () => {
    test('listagem pública só traz aprovados e não expõe o parecer', async () => {
      const res = await request('GET', '/projects?limit=100&approvalStatus=pending');
      assert.equal(res.status, 200);
      const [options] = calls.findAll;
      assert.equal(options.where.approvalStatus, 'approved');
      assert.deepEqual(options.attributes, { exclude: ['reviewNotes'] });
    });

    test('projeto pendente ou rejeitado só existe para dono, colaborador e moderação', async (t) => {
      const collaborator = createUser('creator');
      for (const data of [{}, { approvalStatus: 'rejected', reviewNotes: 'Incompleto.' }]) {
        const project = createProject(t, data, [collaborator]);
        const path = `/projects/${project.id}`;

        assert.equal((await request('GET', path)).status, 404);
        assert.equal((await request('GET', path, createUser('visitor'))).status, 404);
        assert.equal((await request('GET', path, createUser('creator'))).status, 404);

        assert.equal((await request('GET', path, users.get(project.ownerId))).status, 200);
        assert.equal((await request('GET', path, collaborator)).status, 200);
        assert.equal((await request('GET', path, createUser('super_admin'))).status, 200);
      }
    });

    test('criador lê a justificativa da rejeição do próprio projeto', async (t) => {
      const project = createProject(t, { approvalStatus: 'rejected', reviewNotes: 'Faltou o link do repositório.' });
      const res = await request('GET', `/projects/${project.id}`, users.get(project.ownerId));
      const body = await res.json();
      assert.equal(body.project.approvalStatus, 'rejected');
      assert.equal(body.project.reviewNotes, 'Faltou o link do repositório.');
    });

    test('projeto aprovado é público, mas o parecer fica restrito', async (t) => {
      const project = createProject(t, { approvalStatus: 'approved', reviewNotes: 'Comentário interno.' });
      const path = `/projects/${project.id}`;

      for (const viewer of [null, 'token-vencido-ou-falso', createUser('visitor')]) {
        const res = await request('GET', path, viewer);
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.project.approvalStatus, 'approved');
        assert.equal('reviewNotes' in body.project, false);
      }

      const owner = await request('GET', path, users.get(project.ownerId));
      assert.equal((await owner.json()).project.reviewNotes, 'Comentário interno.');
    });
  });

  describe('envio pelo criador', () => {
    const validProject = {
      title: 'Projeto teste',
      description: 'Descrição do projeto teste',
      media: [{ url: 'https://youtu.be/dQw4w9WgXcQ', mediaType: 'video' }],
    };

    test('projeto novo entra como pendente, mesmo que o cliente tente se aprovar', async () => {
      const res = await request('POST', '/projects', createUser('creator'), {
        ...validProject,
        approvalStatus: 'approved',
        reviewNotes: 'aprovado por mim',
        reviewedAt: new Date().toISOString(),
      });
      assert.equal(res.status, 201);
      assert.equal(calls.create[0].approvalStatus, 'pending');
      assert.equal(calls.create[0].reviewNotes, undefined);
      assert.equal(calls.create[0].reviewedAt, undefined);
      assert.equal((await res.json()).project.approvalStatus, 'pending');
    });

    test('editar um projeto rejeitado o reenvia à moderação e reinicia o prazo', async (t) => {
      const project = createProject(t, {
        approvalStatus: 'rejected',
        reviewNotes: 'Incompleto.',
        submittedAt: new Date('2026-10-01T12:00:00.000Z'),
      });
      const before = Date.now();

      const res = await request('PUT', `/projects/${project.id}`, users.get(project.ownerId), { title: 'Corrigido' });
      assert.equal(res.status, 200);
      assert.equal(calls.update[0].approvalStatus, 'pending');
      assert.ok(calls.update[0].submittedAt.getTime() >= before);
      assert.equal(project.approvalStatus, 'pending');
    });

    test('editar um projeto aprovado o devolve à moderação, para o conteúdo não mudar sem nova análise', async (t) => {
      const project = createProject(t, { approvalStatus: 'approved' });
      const before = Date.now();
      const res = await request('PUT', `/projects/${project.id}`, users.get(project.ownerId), { title: 'Novo título' });
      assert.equal(res.status, 200);
      const [values] = calls.update;
      assert.equal(values.approvalStatus, 'pending');
      assert.ok(values.submittedAt.getTime() >= before);
      assert.equal(project.approvalStatus, 'pending');
    });

    test('editar um projeto pendente não muda a situação, nem aceita aprovação pelo corpo', async (t) => {
      const project = createProject(t, { approvalStatus: 'pending' });
      const res = await request('PUT', `/projects/${project.id}`, users.get(project.ownerId), {
        title: 'Novo título',
        approvalStatus: 'approved',
        reviewNotes: 'x',
      });
      assert.equal(res.status, 200);
      assert.deepEqual(calls.update.pop(), { title: 'Novo título' });
      assert.equal(project.approvalStatus, 'pending');
    });

    test('editar um rascunho pela rota comum não o envia à moderação', async (t) => {
      const draft = createProject(t, { approvalStatus: 'draft' });
      const res = await request('PUT', `/projects/${draft.id}`, users.get(draft.ownerId), { title: 'Novo título' });
      assert.equal(res.status, 200);
      assert.deepEqual(calls.update.pop(), { title: 'Novo título' });
      assert.equal(draft.approvalStatus, 'draft');
    });

    test('rascunho incompleto não vai para a moderação', async (t) => {
      const draft = createProject(t, { approvalStatus: 'draft', title: 'Projeto sem título' });
      const owner = users.get(draft.ownerId);

      for (const body of [{}, { title: 'Só o título' }]) {
        const res = await request('POST', `/projects/${draft.id}/submit`, owner, body);
        assert.equal(res.status, 400, JSON.stringify(body));
      }
      assert.equal(calls.update.length, 0);
      assert.equal(draft.approvalStatus, 'draft');
    });

    test('envio do rascunho completa o que falta com o que já estava salvo', async (t) => {
      const owner = createUser('creator', 'Autora');
      const draft = Project.build(
        {
          id: randomUUID(),
          title: 'Título salvo',
          description: 'Descrição salva',
          ownerId: owner.id,
          approvalStatus: 'draft',
          technologies: [{ name: 'React' }],
          collaborators: [],
          media: [{ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', mediaType: 'video', isCover: false }],
        },
        {
          include: [
            { model: ProjectTechnology, as: 'technologies' },
            { model: ProjectCollaborator, as: 'collaborators' },
            { model: ProjectMedia, as: 'media' },
          ],
        }
      );
      t.mock.method(draft, 'update', async (values) => {
        calls.update.push(values);
        draft.set(values);
        return draft;
      });
      projects.set(draft.id, draft);

      const res = await request('POST', `/projects/${draft.id}/submit`, owner, { title: 'Título final' });
      assert.equal(res.status, 200);
      const [values] = calls.update;
      assert.equal(values.title, 'Título final');
      assert.equal(values.description, 'Descrição salva');
      assert.equal(values.approvalStatus, 'pending');
      assert.equal(draft.approvalStatus, 'pending');
    });

    test('"meus projetos" exige login e traz os do autor e os de colaboração, em qualquer situação', async (t) => {
      assert.equal((await request('GET', '/projects/mine')).status, 401);

      const project = createProject(t, { approvalStatus: 'rejected', reviewNotes: 'Incompleto.' });
      const owner = users.get(project.ownerId);
      const collaboratedId = randomUUID();
      ProjectCollaborator.findAll.mock.mockImplementation(async () => [{ projectId: collaboratedId }]);

      const res = await request('GET', '/projects/mine', owner);
      assert.equal(res.status, 200);
      const [options] = calls.findAll;
      assert.deepEqual(options.where[Op.or], [{ ownerId: owner.id }, { id: [collaboratedId] }]);
      assert.equal(options.where.approvalStatus, undefined);

      const [mine] = (await res.json()).projects;
      assert.equal(mine.approvalStatus, 'rejected');
      assert.equal(mine.reviewNotes, 'Incompleto.');
    });
  });
});

describe('prazo de análise (SLA)', () => {
  afterEach(() => {
    process.env.MODERATION_SLA_DAYS = '3';
  });

  test('usa MODERATION_SLA_DAYS e cai no padrão de 3 dias quando o valor é inválido', () => {
    process.env.MODERATION_SLA_DAYS = '7';
    assert.equal(getModerationSlaDays(), 7);

    for (const value of ['', '0', '-2', '1.5', 'abc']) {
      process.env.MODERATION_SLA_DAYS = value;
      assert.equal(getModerationSlaDays(), 3, `valor "${value}"`);
    }
    delete process.env.MODERATION_SLA_DAYS;
    assert.equal(getModerationSlaDays(), 3);
  });

  test('a data limite é o envio somado ao prazo', () => {
    const submittedAt = new Date('2026-10-10T12:00:00.000Z');
    process.env.MODERATION_SLA_DAYS = '5';
    assert.equal(getReviewDueDate(submittedAt).getTime(), submittedAt.getTime() + 5 * DAY_IN_MS);
  });
});
