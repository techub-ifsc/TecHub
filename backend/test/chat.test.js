const { test, describe, before, after, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes, randomUUID } = require('node:crypto');
const http = require('http');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = randomBytes(48).toString('hex');
process.env.JWT_EXPIRES_IN = '1d';

const beforeAll = before;
const afterAll = after;

const express = require('express');
const { io: Client } = require('socket.io-client');
const { User, Conversation, Message } = require('../src/models');
const chatRoutes = require('../src/routes/chatRoutes');
const { errorHandler } = require('../src/middlewares/errorHandler');
const { signToken } = require('../src/utils/jwt');
const { initSocket, closeSocket } = require('../src/socket');

describe('módulo de chat do backend', () => {
  let server;
  let baseUrl;
  let ioServer;
  let users = new Map();
  let conversations = new Map();
  let messages = new Map();
  let activeClients = [];

  function fakeUser(overrides = {}) {
    const id = overrides.id || randomUUID();
    const user = User.build({
      id,
      name: 'Criador IFSC',
      email: `${id}@aluno.ifsc.edu.br`,
      password: 'hash-da-senha',
      role: 'creator',
      emailVerifiedAt: new Date(),
      authVersion: 0,
      major: 'Ciência da Computação',
      avatar_url: null,
      ...overrides,
    });
    user.save = async function () { return this; };
    user.update = async function (vals) { Object.assign(this, vals); return this; };
    return user;
  }

  function tokenFor(user) {
    return signToken({
      sub: user.id,
      role: user.role,
      authVersion: Number(user.authVersion || 0),
    });
  }

  function createConvInstance(data) {
    const record = Conversation.build({
      ...data,
      id: data.id || randomUUID(),
      created_at: new Date(),
      updated_at: new Date(),
    });
    record.user1 = users.get(record.user1_id) || null;
    record.user2 = users.get(record.user2_id) || null;
    record.save = async function () { return this; };
    record.update = async function (vals) { Object.assign(this, vals); return this; };
    return record;
  }

  function createMessageInstance(data) {
    const record = Message.build({
      ...data,
      id: data.id || randomUUID(),
      created_at: new Date(),
      updated_at: new Date(),
    });
    record.save = async function () { return this; };
    record.update = async function (vals) { Object.assign(this, vals); return this; };
    return record;
  }

  beforeAll(async () => {
    mock.method(User, 'findByPk', async (id) => users.get(id) || null);

    mock.method(Conversation, 'findByPk', async (id) => conversations.get(id) || null);
    mock.method(Conversation, 'findAll', async (options) => {
      const list = Array.from(conversations.values());
      const orConditions = options?.where?.[Symbol.for('or')];
      if (orConditions) {
        const userId = orConditions[0]?.user1_id || orConditions[1]?.user2_id;
        return list.filter((c) => c.user1_id === userId || c.user2_id === userId);
      }
      return list;
    });
    mock.method(Conversation, 'findOne', async (options) => {
      const list = Array.from(conversations.values());
      if (options?.where?.[Symbol.for('or')]) {
        const conds = options.where[Symbol.for('or')];
        return list.find((c) =>
          conds.some(
            (cond) =>
              (c.user1_id === cond.user1_id && c.user2_id === cond.user2_id) ||
              (c.user1_id === cond.user2_id && c.user2_id === cond.user1_id)
          )
        ) || null;
      }
      return null;
    });
    mock.method(Conversation, 'create', async (data) => {
      const record = createConvInstance(data);
      conversations.set(record.id, record);
      return record;
    });
    mock.method(Conversation, 'findOrCreate', async (options) => {
      const existing = await Conversation.findOne({ where: { [Symbol.for('or')]: [options.where] } });
      if (existing) return [existing, false];
      const created = await Conversation.create(options.defaults || options.where);
      return [created, true];
    });

    mock.method(Message, 'findAll', async (options) => {
      const convId = options?.where?.conversation_id;
      return Array.from(messages.values()).filter((m) => m.conversation_id === convId);
    });
    mock.method(Message, 'findOne', async (options) => {
      const convId = options?.where?.conversation_id;
      const list = Array.from(messages.values()).filter((m) => m.conversation_id === convId);
      return list.length ? list[list.length - 1] : null;
    });
    mock.method(Message, 'count', async (options) => {
      const convId = options?.where?.conversation_id;
      const recipientId = options?.where?.recipient_id;
      return Array.from(messages.values()).filter(
        (m) =>
          m.conversation_id === convId &&
          m.recipient_id === recipientId &&
          m.read_at === null
      ).length;
    });
    mock.method(Message, 'create', async (data) => {
      const record = createMessageInstance(data);
      messages.set(record.id, record);
      return record;
    });
    mock.method(Message, 'update', async (values, options) => {
      const convId = options?.where?.conversation_id;
      const recipientId = options?.where?.recipient_id;
      let count = 0;
      for (const m of messages.values()) {
        if (m.conversation_id === convId && m.recipient_id === recipientId && m.read_at === null) {
          m.read_at = values.read_at || new Date();
          count += 1;
        }
      }
      return [count];
    });

    const app = express();
    app.use(express.json());
    app.use('/api/chat', chatRoutes);
    app.use(errorHandler);

    server = http.createServer(app);
    ioServer = initSocket(server);

    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  beforeEach(() => {
    users.clear();
    conversations.clear();
    messages.clear();
    activeClients = [];
  });

  afterEach(async () => {
    for (const client of activeClients) {
      try {
        if (client.connected) client.disconnect();
        client.close();
      } catch (e) {}
    }
    activeClients = [];
  });

  afterAll(async () => {
    for (const client of activeClients) {
      try {
        if (client.connected) client.disconnect();
        client.close();
      } catch (e) {}
    }
    activeClients = [];

    if (ioServer) {
      try {
        ioServer.disconnectSockets(true);
      } catch (e) {}
      await new Promise((resolve) => {
        ioServer.close(() => resolve());
      });
      ioServer = null;
    }

    closeSocket();

    if (server) {
      if (typeof server.closeAllConnections === 'function') {
        server.closeAllConnections();
      }
      await new Promise((resolve) => {
        server.close(() => resolve());
      });
      server = null;
    }

    if (typeof mock?.restoreAll === 'function') {
      mock.restoreAll();
    }
  });

  test('GET /api/chat/conversations exige token e retorna 401 quando ausente', async () => {
    const res = await fetch(`${baseUrl}/api/chat/conversations`);
    assert.equal(res.status, 401);
  });

  test('POST /api/chat/conversations/init cria conversa ou retorna existente', async () => {
    const userA = fakeUser({ name: 'Alice Silva' });
    const userB = fakeUser({ name: 'Bob Souza' });
    users.set(userA.id, userA);
    users.set(userB.id, userB);

    const tokenA = tokenFor(userA);

    // Tentativa com próprio usuário falha
    const selfRes = await fetch(`${baseUrl}/api/chat/conversations/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ recipientId: userA.id }),
    });
    assert.equal(selfRes.status, 400);

    // Criação de conversa válida
    const createRes = await fetch(`${baseUrl}/api/chat/conversations/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ recipientId: userB.id }),
    });

    assert.equal(createRes.status, 201);
    const data = await createRes.json();
    assert.ok(data.id);
    assert.equal(data.participant.name, 'Bob Souza');
    assert.equal(data.unreadCount, 0);

    // Chamar init novamente para o mesmo usuário retorna a mesma conversa (200)
    const secondRes = await fetch(`${baseUrl}/api/chat/conversations/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ recipientId: userB.id }),
    });

    assert.equal(secondRes.status, 200);
    const secondData = await secondRes.json();
    assert.equal(secondData.id, data.id);
  });

  test('POST /api/chat/conversations/:id/messages envia mensagem e GET lista com histórico', async () => {
    const userA = fakeUser({ name: 'Alice Silva' });
    const userB = fakeUser({ name: 'Bob Souza' });
    users.set(userA.id, userA);
    users.set(userB.id, userB);

    const conv = await Conversation.create({
      user1_id: userA.id,
      user2_id: userB.id,
      updated_at: new Date(),
    });

    const tokenA = tokenFor(userA);
    const tokenB = tokenFor(userB);

    // Alice envia mensagem
    const sendRes = await fetch(`${baseUrl}/api/chat/conversations/${conv.id}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ content: 'Olá Bob, tudo bem com você?' }),
    });

    assert.equal(sendRes.status, 201);
    const sentData = await sendRes.json();
    assert.equal(sentData.content, 'Olá Bob, tudo bem com você?');
    assert.equal(sentData.senderId, userA.id);
    assert.equal(sentData.read, false);

    // Bob consulta as mensagens e marca como lida
    const listRes = await fetch(`${baseUrl}/api/chat/conversations/${conv.id}/messages`, {
      headers: {
        Authorization: `Bearer ${tokenB}`,
      },
    });

    assert.equal(listRes.status, 200);
    const listData = await listRes.json();
    assert.equal(listData.length, 1);
    assert.equal(listData[0].text, 'Olá Bob, tudo bem com você?');
  });

  test('comunicação em tempo real via Socket.io com autenticação e evento send_message', async () => {
    const userA = fakeUser({ name: 'Alice Silva' });
    const userB = fakeUser({ name: 'Bob Souza' });
    users.set(userA.id, userA);
    users.set(userB.id, userB);

    const conv = await Conversation.create({
      user1_id: userA.id,
      user2_id: userB.id,
      updated_at: new Date(),
    });

    const tokenA = tokenFor(userA);
    const tokenB = tokenFor(userB);

    // Conecta socket de Alice e socket de Bob
    const socketA = Client(baseUrl, {
      auth: { token: tokenA },
      transports: ['websocket'],
      forceNew: true,
    });
    activeClients.push(socketA);

    const socketB = Client(baseUrl, {
      auth: { token: tokenB },
      transports: ['websocket'],
      forceNew: true,
    });
    activeClients.push(socketB);

    await Promise.all([
      new Promise((resolve) => socketA.on('connect', resolve)),
      new Promise((resolve) => socketB.on('connect', resolve)),
    ]);

    // Bob aguarda recebimento de mensagem instantânea
    const messagePromise = new Promise((resolve) => {
      socketB.on('new_message', (msg) => {
        resolve(msg);
      });
    });

    // Alice dispara mensagem pelo socket
    socketA.emit('send_message', {
      conversationId: conv.id,
      recipientId: userB.id,
      content: 'Mensagem instantânea via WebSocket!',
    });

    const receivedMessage = await messagePromise;
    assert.equal(receivedMessage.content, 'Mensagem instantânea via WebSocket!');
    assert.equal(receivedMessage.senderId, userA.id);
    assert.equal(receivedMessage.conversationId, conv.id);

    socketA.disconnect();
    socketA.close();
    socketB.disconnect();
    socketB.close();
  });

  test('socket recusa sessão encerrada e conta sem e-mail confirmado, e derruba socket aberto', async () => {
    const connect = (token) => new Promise((resolve) => {
      const socket = Client(baseUrl, { auth: { token }, transports: ['websocket'], forceNew: true, reconnection: false });
      activeClients.push(socket);
      socket.on('connect', () => resolve({ socket, error: null }));
      socket.on('connect_error', (err) => resolve({ socket, error: err.message }));
    });

    const user = fakeUser();
    const other = fakeUser();
    users.set(user.id, user);
    users.set(other.id, other);
    const conv = await Conversation.create({ user1_id: user.id, user2_id: other.id, updated_at: new Date() });

    const open = await connect(tokenFor(user));
    assert.equal(open.error, null);

    // Sair de todos os aparelhos (ou trocar a senha) muda a versão da sessão.
    user.authVersion = 1;
    const closed = new Promise((resolve) => open.socket.on('disconnect', resolve));
    const ack = await new Promise((resolve) => open.socket.emit(
      'send_message',
      { conversationId: conv.id, content: 'depois de sair' },
      resolve,
    ));
    assert.equal(ack.error, 'Sessão inválida. Entre novamente.');
    await closed;
    assert.equal([...messages.values()].some((m) => m.content === 'depois de sair'), false);

    const stale = await connect(signToken({ sub: user.id, role: user.role, authVersion: 0 }));
    assert.equal(stale.error, 'Sessão inválida. Entre novamente.');

    const unverified = fakeUser({ emailVerifiedAt: null });
    users.set(unverified.id, unverified);
    const pending = await connect(tokenFor(unverified));
    assert.equal(pending.error, 'Confirme seu e-mail antes de acessar a plataforma.');
  });
});
