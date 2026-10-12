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
const { createUploadSignature } = require('../src/services/mediaStorageService');

const CLOUD_BASE = 'https://res.cloudinary.com/techub-test';
// Mesmo formato das URLs geradas pelas assinaturas de upload.
const mediaName = (n) => `media_${1700000000000 + n}_${'ab12cd34ef56ab78'}`;
const imageUrl = (n = 1) => `${CLOUD_BASE}/image/upload/v1700000000/techub/projects/${mediaName(n)}.webp`;
const videoUrl = `${CLOUD_BASE}/video/upload/v1700000000/techub/projects/${mediaName(99)}.mp4`;


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
      { url: 'https://www.youtube.com/shorts/9bZkp7q19f0', mediaType: 'video' },
    ]);
    assert.equal(result.success, true);
    assert.deepEqual(result.data.media.map((m) => m.url), [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://www.youtube.com/watch?v=9bZkp7q19f0',
    ]);
  });

  test('rejeita o mesmo vídeo do YouTube em formatos diferentes', () => {
    const result = parseMedia([
      { url: 'https://youtu.be/dQw4w9WgXcQ', mediaType: 'video' },
      { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', mediaType: 'video' },
    ]);
    assert.equal(result.success, false);
  });

  const invalidCases = [
    ['sem mídias', []],
    ['mais de 10 mídias', Array.from({ length: 11 }, (_, i) => ({ url: imageUrl(i), mediaType: 'image' }))],
    ['URL de outro site', [{ url: 'https://evil.example.com/a.webp', mediaType: 'image' }]],
    ['URL de outra conta do Cloudinary', [{ url: 'https://res.cloudinary.com/outra/image/upload/v1/techub/projects/a.webp', mediaType: 'image' }]],
    ['URL fora da pasta de projetos', [{ url: `${CLOUD_BASE}/image/upload/v1/outra/${mediaName(1)}.webp`, mediaType: 'image' }]],
    ['URL com transformação embutida', [{ url: `${CLOUD_BASE}/image/upload/w_9000/v1/techub/projects/${mediaName(1)}.webp`, mediaType: 'image' }]],
    ['URL com navegação de pasta', [{ url: `${CLOUD_BASE}/image/upload/v1/outra/../techub/projects/${mediaName(1)}.webp`, mediaType: 'image' }]],
    ['URL com navegação de pasta codificada', [{ url: `${CLOUD_BASE}/image/upload/v1/outra/%2e%2e/techub/projects/${mediaName(1)}.webp`, mediaType: 'image' }]],
    ['URL com query string', [{ url: `${imageUrl(1)}?a=1`, mediaType: 'image' }]],
    ['imagem que não é webp', [{ url: imageUrl(1).replace('.webp', '.png'), mediaType: 'image' }]],
    ['vídeo do storage marcado como imagem', [{ url: videoUrl, mediaType: 'image' }]],
    ['http sem criptografia', [{ url: imageUrl(1).replace('https:', 'http:'), mediaType: 'image' }]],
    ['mídia repetida', [{ url: imageUrl(1), mediaType: 'image' }, { url: imageUrl(1), mediaType: 'image' }]],
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

describe('assinatura de upload direto', () => {
  test('trava pasta, nome, conversão para webp e impede sobrescrever (imagem)', () => {
    const { mediaType, uploadUrl, fields } = createUploadSignature('image/png');
    assert.equal(mediaType, 'image');
    assert.equal(uploadUrl, 'https://api.cloudinary.com/v1_1/techub-test/image/upload');
    assert.equal(fields.folder, 'techub/projects');
    assert.match(fields.public_id, /^media_\d+_[0-9a-f]{16}$/);
    assert.equal(fields.format, 'webp');
    assert.equal(fields.transformation, 'c_limit,h_1920,q_auto,w_1920');
    assert.equal(fields.overwrite, false);
    // allowed_formats desativa a conversão de formato no Cloudinary
    assert.equal(fields.allowed_formats, undefined);
    assert.equal(fields.api_key, 'test-key');
    assert.equal(JSON.stringify(fields).includes('test-secret'), false);
  });

  test('vídeos aceitam somente mp4 e webm, sem conversão', () => {
    const { mediaType, uploadUrl, fields } = createUploadSignature('video/webm');
    assert.equal(mediaType, 'video');
    assert.match(uploadUrl, /\/video\/upload$/);
    assert.equal(fields.allowed_formats, 'mp4,webm');
    assert.equal(fields.format, undefined);
    assert.equal(fields.transformation, undefined);
  });

  test('a assinatura cobre todos os parâmetros travados', () => {
    const { fields } = createUploadSignature('image/jpeg');
    const { signature, api_key: apiKey, ...signed } = fields;
    assert.equal(signature, cloudinary.utils.api_sign_request(signed, 'test-secret'));
    // Alterar qualquer parâmetro muda a assinatura esperada.
    for (const key of ['folder', 'public_id', 'format', 'transformation', 'overwrite']) {
      const tampered = { ...signed, [key]: key === 'overwrite' ? true : 'outro' };
      assert.notEqual(signature, cloudinary.utils.api_sign_request(tampered, 'test-secret'), key);
    }
  });

  test('cada assinatura gera um nome de arquivo diferente', () => {
    const names = new Set(Array.from({ length: 20 }, () => createUploadSignature('image/png').fields.public_id));
    assert.equal(names.size, 20);
  });

  test('a URL que o Cloudinary devolve é aceita no cadastro do projeto', () => {
    const { fields } = createUploadSignature('image/png');
    const url = `${CLOUD_BASE}/image/upload/v1700000000/${fields.folder}/${fields.public_id}.webp`;
    assert.equal(parseMedia([{ url, mediaType: 'image' }]).success, true);
  });
});

describe('POST /api/media/signature', () => {
  let server;
  let baseUrl;
  const user = User.build({ name: 'Criador', email: 'criador@ifsc.edu.br', password: 'x', role: 'creator' });

  beforeEach(async (t) => {
    t.mock.method(User, 'findByPk', async (id) => (id === user.id ? user : null));

    delete require.cache[require.resolve('../src/routes/mediaRoutes')];
    const app = express();
    app.use(express.json());
    app.use('/api/media', require('../src/routes/mediaRoutes'));
    app.use(errorHandler);
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}/api/media/signature`;
  });

  afterEach(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });

  function request(body, { auth = true } = {}) {
    return fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(auth && { Authorization: `Bearer ${signToken({ sub: user.id, role: user.role })}` }),
      },
      body: JSON.stringify(body),
    });
  }

  test('assina o envio de uma imagem', async () => {
    const res = await request({ type: 'image/jpeg', size: 2 * 1024 * 1024 });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.mediaType, 'image');
    assert.equal(body.fields.format, 'webp');
    assert.ok(body.fields.signature);
  });

  test('assina o envio de um vídeo', async () => {
    const res = await request({ type: 'video/mp4', size: 5 * 1024 * 1024 });
    assert.equal(res.status, 201);
    assert.equal((await res.json()).fields.allowed_formats, 'mp4,webm');
  });

  test('exige autenticação', async () => {
    const res = await request({ type: 'image/png', size: 1000 }, { auth: false });
    assert.equal(res.status, 401);
  });

  test('recusa visitantes', async () => {
    const original = user.role;
    user.role = 'visitor';
    try {
      const res = await request({ type: 'image/png', size: 1000 });
      assert.equal(res.status, 403);
    } finally {
      user.role = original;
    }
  });

  const invalidCases = [
    ['formato não permitido (GIF)', { type: 'image/gif', size: 1000 }],
    ['formato não permitido (MOV)', { type: 'video/quicktime', size: 1000 }],
    ['arquivo acima de 10 MB', { type: 'image/png', size: 10 * 1024 * 1024 + 1 }],
    ['arquivo vazio', { type: 'image/png', size: 0 }],
    ['sem tamanho', { type: 'image/png' }],
  ];

  for (const [name, body] of invalidCases) {
    test(`recusa ${name}`, async () => {
      const res = await request(body);
      assert.equal(res.status, 400);
    });
  }

  test('responde 503 quando o Cloudinary não está configurado', async () => {
    const secret = process.env.CLOUDINARY_API_SECRET;
    delete process.env.CLOUDINARY_API_SECRET;
    try {
      const res = await request({ type: 'image/png', size: 1000 });
      assert.equal(res.status, 503);
    } finally {
      process.env.CLOUDINARY_API_SECRET = secret;
    }
  });
});
