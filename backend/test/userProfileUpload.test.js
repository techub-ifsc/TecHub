const { test, describe, before, after, beforeEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes, randomUUID } = require('node:crypto');
const { Writable } = require('node:stream');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = randomBytes(48).toString('hex');
process.env.CREATOR_ALLOWED_DOMAINS = '@ifsc.edu.br,@aluno.ifsc.edu.br';
process.env.CLOUDINARY_CLOUD_NAME = 'techub-test';
process.env.CLOUDINARY_API_KEY = 'test-key';
process.env.CLOUDINARY_API_SECRET = 'test-secret';
process.env.DB_USER ??= 'teste';
process.env.DB_PASSWORD ??= 'teste';
process.env.DB_NAME ??= 'teste';
process.env.DB_HOST ??= 'localhost';

const express = require('express');
const { User } = require('../src/models');
const { cloudinary } = require('../src/config/cloudinary');
const { errorHandler } = require('../src/middlewares/errorHandler');
const { signToken } = require('../src/utils/jwt');
const { detectImageType, imageLooksValid, MAX_AVATAR_BYTES } = require('../src/controllers/userProfileController');

// Cabeçalhos mínimos de cada formato, seguidos de bytes quaisquer.
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), randomBytes(64)]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), randomBytes(64)]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), randomBytes(64)]);
const PDF = Buffer.concat([Buffer.from('%PDF-1.7\n'), randomBytes(64)]);

describe('detecção do formato da imagem', () => {
  test('reconhece JPG, PNG e WEBP pelo conteúdo', () => {
    assert.equal(detectImageType(JPEG), 'image/jpeg');
    assert.equal(detectImageType(PNG), 'image/png');
    assert.equal(detectImageType(WEBP), 'image/webp');
    assert.equal(detectImageType(PDF), null);
    assert.equal(detectImageType(Buffer.from('<svg onload="alert(1)">')), null);
  });

  test('recusa tipo informado diferente do conteúdo e arquivo grande demais', () => {
    assert.equal(imageLooksValid({ mimetype: 'image/png', size: PNG.length, buffer: PNG }, MAX_AVATAR_BYTES), true);
    assert.equal(imageLooksValid({ mimetype: 'image/jpeg', size: PNG.length, buffer: PNG }, MAX_AVATAR_BYTES), false);
    assert.equal(imageLooksValid({ mimetype: 'image/png', size: MAX_AVATAR_BYTES + 1, buffer: PNG }, MAX_AVATAR_BYTES), false);
    assert.equal(imageLooksValid({ mimetype: 'image/png', size: 0, buffer: Buffer.alloc(0) }, MAX_AVATAR_BYTES), false);
  });
});

describe('PUT /users/me com fotos', () => {
  let server;
  let baseUrl;
  let users;
  let uploads;
  let destroyed;
  let failUploadOf;
  let failUploadWith;

  before(async () => {
    mock.method(User, 'findByPk', async (id) => users.get(id) || null);
    mock.method(User.prototype, 'save', async function save() {
      users.set(this.id, this);
      return this;
    });
    mock.method(cloudinary.uploader, 'upload_stream', (options, callback) => {
      const chunks = [];
      return new Writable({
        write(chunk, _encoding, done) { chunks.push(chunk); done(); },
        final(done) {
          const kind = options.public_id.split('_')[0];
          if (kind === failUploadOf) {
            callback(failUploadWith || new Error('falha simulada'));
          } else {
            const publicId = `${options.folder}/${options.public_id}`;
            uploads.push({ options, bytes: Buffer.concat(chunks).length, publicId });
            callback(null, { secure_url: `https://res.cloudinary.com/techub-test/image/upload/${publicId}.webp`, public_id: publicId });
          }
          done();
        },
      });
    });
    mock.method(cloudinary.uploader, 'destroy', async (publicId, options) => {
      destroyed.push({ publicId, resourceType: options.resource_type });
      return { result: 'ok' };
    });

    const app = express();
    app.use(express.json());
    app.use('/api/users', require('../src/routes/userProfileRoutes'));
    app.use(errorHandler);
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}/api/users`;
  });

  after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    mock.restoreAll();
  });

  beforeEach(() => {
    users = new Map();
    uploads = [];
    destroyed = [];
    failUploadOf = null;
    failUploadWith = null;
  });

  function creator(extra = {}) {
    const user = User.build({
      name: 'Ana Souza', email: `ana-${randomUUID().slice(0, 6)}@aluno.ifsc.edu.br`, password: 'x', role: 'creator',
      emailVerifiedAt: new Date(), ...extra,
    });
    users.set(user.id, user);
    return user;
  }

  // Envia o formulário do perfil com os arquivos indicados: { avatar: [buffer, tipo, nome] }.
  function saveProfile(user, files = {}, fields = {}) {
    const body = new FormData();
    body.append('name', 'Ana Souza');
    for (const [key, value] of Object.entries(fields)) body.append(key, value);
    for (const [field, [buffer, type, name]] of Object.entries(files)) {
      body.append(field, new Blob([buffer], { type }), name);
    }
    return fetch(`${baseUrl}/me`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${signToken({ sub: user.id, role: user.role })}` },
      body,
    });
  }

  test('salva foto e capa no Cloudinary, convertidas para webp, na pasta do usuário', async () => {
    const user = creator();
    const res = await saveProfile(user, {
      avatar: [PNG, 'image/png', 'foto.png'],
      banner: [JPEG, 'image/jpeg', 'capa.jpg'],
    });
    assert.equal(res.status, 200);
    const { user: saved } = await res.json();
    assert.match(saved.avatar_url, /^https:\/\/res\.cloudinary\.com\/.+avatar_/);
    assert.match(saved.banner_url, /^https:\/\/res\.cloudinary\.com\/.+banner_/);
    assert.equal(saved.avatar_public_id, undefined, 'o identificador interno não vai para o cliente');

    const avatar = uploads.find((u) => u.publicId.includes('avatar_'));
    assert.equal(avatar.options.folder, `techub/users/${user.id}`);
    assert.equal(avatar.options.format, 'webp');
    assert.equal(avatar.options.resource_type, 'image');
    // Objeto, e não texto: o Cloudinary lê texto como nome de transformação salva.
    assert.deepEqual(avatar.options.transformation, [{ crop: 'fill', gravity: 'face', width: 500, height: 500, quality: 'auto' }]);
    const banner = uploads.find((u) => u.publicId.includes('banner_'));
    assert.deepEqual(banner.options.transformation, [{ crop: 'limit', width: 1600, height: 900, quality: 'auto' }]);
    assert.equal(uploads.find((u) => u.publicId.includes('banner_')).options.format, 'webp');
  });

  test('recusa formato não permitido, arquivo disfarçado e foto acima de 3 MB', async () => {
    const user = creator();
    const bigJpeg = Buffer.concat([JPEG, Buffer.alloc(MAX_AVATAR_BYTES)]);
    const cases = [
      { avatar: [PDF, 'application/pdf', 'foto.pdf'] },
      { avatar: [Buffer.from('<svg onload="alert(1)"></svg>'), 'image/svg+xml', 'foto.svg'] },
      { avatar: [Buffer.from('não sou imagem'), 'image/png', 'foto.png'] },
      { avatar: [bigJpeg, 'image/jpeg', 'grande.jpg'] },
      { banner: [Buffer.alloc(6 * 1024 * 1024), 'image/jpeg', 'enorme.jpg'] },
      { outro: [PNG, 'image/png', 'x.png'] },
    ];
    for (const files of cases) {
      const res = await saveProfile(user, files);
      assert.equal(res.status, 400, Object.keys(files)[0]);
    }
    assert.equal(uploads.length, 0);
    assert.equal(user.avatar_url ?? null, null);
  });

  test('trocar a foto apaga a anterior do Cloudinary, depois de salvar a nova', async () => {
    const user = creator({ avatar_url: 'https://res.cloudinary.com/x/old.webp', avatar_public_id: 'techub/users/old/avatar_1' });
    const res = await saveProfile(user, { avatar: [WEBP, 'image/webp', 'nova.webp'] });
    assert.equal(res.status, 200);
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(destroyed, [{ publicId: 'techub/users/old/avatar_1', resourceType: 'image' }]);
    assert.notEqual(user.avatar_public_id, 'techub/users/old/avatar_1');
  });

  test('remover a capa limpa os campos e apaga o arquivo', async () => {
    const user = creator({ banner_url: 'https://res.cloudinary.com/x/b.webp', banner_public_id: 'techub/users/u/banner_1' });
    const res = await saveProfile(user, {}, { remove_banner: 'true' });
    assert.equal(res.status, 200);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(user.banner_url, null);
    assert.deepEqual(destroyed, [{ publicId: 'techub/users/u/banner_1', resourceType: 'image' }]);
  });

  test('enviar e remover a mesma foto ao mesmo tempo é recusado', async () => {
    const user = creator();
    const res = await saveProfile(user, { avatar: [PNG, 'image/png', 'f.png'] }, { remove_avatar: 'true' });
    assert.equal(res.status, 400);
    assert.equal(uploads.length, 0);
  });

  test('se um envio falha no meio, o que já subiu é apagado e o perfil não muda', async () => {
    const user = creator();
    failUploadOf = 'banner';
    const res = await saveProfile(user, {
      avatar: [PNG, 'image/png', 'foto.png'],
      banner: [JPEG, 'image/jpeg', 'capa.jpg'],
    });
    assert.equal(res.status, 500);
    assert.equal(uploads.length, 1);
    assert.deepEqual(destroyed.map((d) => d.publicId), [uploads[0].publicId]);
    assert.equal(user.avatar_url ?? null, null);
  });

  test('recusa do Cloudinary vira mensagem clara (502), não "erro interno"', async () => {
    const user = creator();
    failUploadOf = 'avatar';
    failUploadWith = Object.assign(new Error('Transformation Unknown transformation c_fill'), { http_code: 400 });
    const res = await saveProfile(user, { avatar: [PNG, 'image/png', 'foto.png'] });
    assert.equal(res.status, 502);
    assert.match((await res.json()).message, /Não foi possível enviar o arquivo/);
  });

  test('o perfil público mostra foto e capa, sem os identificadores internos', async () => {
    const user = creator({
      avatar_url: 'https://res.cloudinary.com/x/a.webp', avatar_public_id: 'p/a',
      banner_url: 'https://res.cloudinary.com/x/b.webp', banner_public_id: 'p/b',
    });
    const res = await fetch(`${baseUrl}/${user.id}`);
    const { profile } = await res.json();
    assert.equal(profile.avatar_url, 'https://res.cloudinary.com/x/a.webp');
    assert.equal(profile.banner_url, 'https://res.cloudinary.com/x/b.webp');
    assert.equal(profile.avatar_public_id, undefined);
    assert.equal(profile.banner_public_id, undefined);
  });
});
