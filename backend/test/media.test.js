const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = randomBytes(48).toString('hex');
process.env.JWT_EXPIRES_IN = '1d';
process.env.CLOUDINARY_CLOUD_NAME = 'techub-test';
process.env.CLOUDINARY_API_KEY = 'test-key';
process.env.CLOUDINARY_API_SECRET = 'test-secret';

const express = require('express');
const { User } = require('../src/models');
const { cloudinary } = require('../src/config/cloudinary');
const { errorHandler } = require('../src/middlewares/errorHandler');
const { signToken } = require('../src/utils/jwt');
const { createProjectSchema } = require('../src/validators/projectValidators');
const { matchesDeclaredType } = require('../src/services/mediaStorageService');

const CLOUD_BASE = 'https://res.cloudinary.com/techub-test';
const imageUrl = (n = 1) => `${CLOUD_BASE}/image/upload/v1/techub/projects/media_${n}.webp`;
const videoUrl = `${CLOUD_BASE}/video/upload/v1/techub/projects/media_9.mp4`;

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
const WEBP = Buffer.from('RIFF\0\0\0\0WEBPVP8 ', 'binary');
const MP4 = Buffer.from('\0\0\0\x18ftypmp42', 'binary');
const WEBM = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f]);

const baseProject = {
  title: 'Projeto de teste',
  description: 'Descrição do projeto de teste',
};

function parseMedia(media) {
  return createProjectSchema.safeParse({ ...baseProject, media });
}

describe('validação das mídias do projeto', () => {
  test('aceita mídia enviada pela plataforma e define a primeira imagem como capa', () => {
    const result = parseMedia([
      { url: videoUrl, mediaType: 'video' },
      { url: imageUrl(1), mediaType: 'image' },
      { url: imageUrl(2), mediaType: 'image' },
    ]);
    assert.equal(result.success, true);
    assert.deepEqual(result.data.media.map((m) => m.isCover), [false, true, false]);
  });

  test('mantém a capa escolhida pelo usuário', () => {
    const result = parseMedia([
      { url: imageUrl(1), mediaType: 'image' },
      { url: imageUrl(2), mediaType: 'image', isCover: true },
    ]);
    assert.deepEqual(result.data.media.map((m) => m.isCover), [false, true]);
  });

  test('normaliza links do YouTube', () => {
    const result = parseMedia([
      { url: 'https://youtu.be/dQw4w9WgXcQ?t=10', mediaType: 'video' },
      { url: 'https://www.youtube.com/shorts/dQw4w9WgXcQ', mediaType: 'video' },
    ]);
    assert.equal(result.success, true);
    assert.deepEqual(result.data.media.map((m) => m.url), [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    ]);
  });

  const invalidCases = [
    ['sem mídias', []],
    ['mais de 10 mídias', Array.from({ length: 11 }, (_, i) => ({ url: imageUrl(i), mediaType: 'image' }))],
    ['URL de outro site', [{ url: 'https://evil.example.com/a.webp', mediaType: 'image' }]],
    ['URL de outra conta do Cloudinary', [{ url: 'https://res.cloudinary.com/outra/image/upload/v1/techub/projects/a.webp', mediaType: 'image' }]],
    ['URL fora da pasta de projetos', [{ url: `${CLOUD_BASE}/image/upload/v1/outra/a.webp`, mediaType: 'image' }]],
    ['YouTube marcado como imagem', [{ url: 'https://youtu.be/dQw4w9WgXcQ', mediaType: 'image' }]],
    ['tipo inválido', [{ url: imageUrl(), mediaType: 'audio' }]],
    ['duas capas', [{ url: imageUrl(1), mediaType: 'image', isCover: true }, { url: imageUrl(2), mediaType: 'image', isCover: true }]],
    ['vídeo como capa', [{ url: videoUrl, mediaType: 'video', isCover: true }]],
  ];

  for (const [name, media] of invalidCases) {
    test(`rejeita ${name}`, () => {
      assert.equal(parseMedia(media).success, false);
    });
  }

  test('exige o campo media', () => {
    assert.equal(createProjectSchema.safeParse(baseProject).success, false);
  });
});

describe('assinatura binária dos arquivos', () => {
  test('reconhece os formatos permitidos', () => {
    assert.equal(matchesDeclaredType(PNG, 'image/png'), true);
    assert.equal(matchesDeclaredType(JPEG, 'image/jpeg'), true);
    assert.equal(matchesDeclaredType(WEBP, 'image/webp'), true);
    assert.equal(matchesDeclaredType(MP4, 'video/mp4'), true);
    assert.equal(matchesDeclaredType(WEBM, 'video/webm'), true);
  });

  test('rejeita conteúdo que não corresponde ao tipo declarado', () => {
    assert.equal(matchesDeclaredType(Buffer.from('<script>alert(1)</script>'), 'image/png'), false);
    assert.equal(matchesDeclaredType(PNG, 'image/jpeg'), false);
  });
});

describe('POST /api/media/upload', () => {
  let server;
  let baseUrl;
  let uploads;
  const user = User.build({ name: 'Criador', email: 'criador@ifsc.edu.br', password: 'x', role: 'creator' });

  beforeEach(async (t) => {
    uploads = [];
    t.mock.method(User, 'findByPk', async (id) => (id === user.id ? user : null));
    t.mock.method(cloudinary.uploader, 'upload_stream', (options, callback) => ({
      end: () => {
        uploads.push(options);
        const ext = options.format || 'mp4';
        callback(null, { secure_url: `${CLOUD_BASE}/${options.resource_type}/upload/v1/${options.folder}/${options.public_id}.${ext}` });
      },
    }));

    delete require.cache[require.resolve('../src/routes/mediaRoutes')];
    const app = express();
    app.use('/api/media', require('../src/routes/mediaRoutes'));
    app.use(errorHandler);
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}/api/media/upload`;
  });

  afterEach(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });

  function send(files, { auth = true } = {}) {
    const form = new FormData();
    for (const [name, type, buffer] of files) {
      form.append('files', new Blob([buffer], { type }), name);
    }
    const headers = auth ? { Authorization: `Bearer ${signToken({ sub: user.id, role: user.role })}` } : {};
    return fetch(baseUrl, { method: 'POST', body: form, headers });
  }

  test('envia imagens e vídeos e devolve as URLs na ordem', async () => {
    const res = await send([['capa.png', 'image/png', PNG], ['demo.mp4', 'video/mp4', MP4]]);
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.deepEqual(body.media.map((m) => m.mediaType), ['image', 'video']);
    assert.match(body.media[0].url, /\/techub\/projects\/media_\d+_[0-9a-f]{16}\.webp$/);
    assert.equal(uploads[0].format, 'webp');
    assert.equal(uploads[1].resource_type, 'video');

    // As URLs devolvidas precisam ser aceitas pelo cadastro do projeto.
    assert.equal(parseMedia(body.media).success, true);
  });

  test('exige autenticação', async () => {
    const res = await send([['capa.png', 'image/png', PNG]], { auth: false });
    assert.equal(res.status, 401);
    assert.equal(uploads.length, 0);
  });

  test('rejeita formato não permitido', async () => {
    const res = await send([['anim.gif', 'image/gif', Buffer.from('GIF89a')]]);
    assert.equal(res.status, 400);
    assert.equal(uploads.length, 0);
  });

  test('rejeita arquivo disfarçado e não envia nenhum dos arquivos', async () => {
    const res = await send([['ok.png', 'image/png', PNG], ['fake.png', 'image/png', Buffer.from('<html>')]]);
    assert.equal(res.status, 400);
    assert.equal(uploads.length, 0);
  });

  test('rejeita arquivo acima de 20 MB', async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(20 * 1024 * 1024)]);
    const res = await send([['grande.png', 'image/png', big]]);
    assert.equal(res.status, 400);
    assert.equal((await res.json()).message, 'Cada arquivo deve ter no máximo 20 MB.');
  });

  test('rejeita mais de 10 arquivos', async () => {
    const files = Array.from({ length: 11 }, (_, i) => [`f${i}.png`, 'image/png', PNG]);
    const res = await send(files);
    assert.equal(res.status, 400);
    assert.equal(uploads.length, 0);
  });

  test('rejeita envio sem arquivos', async () => {
    const res = await send([]);
    assert.equal(res.status, 400);
  });
});
