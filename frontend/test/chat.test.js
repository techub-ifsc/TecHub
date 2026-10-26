import test from "node:test";
import assert from "node:assert/strict";

import {
  formatMessageTime,
  formatConversationDate,
  formatDateDivider,
  findOrCreateConversation,
  addMessageToConversation,
  markAsRead,
  getTotalUnreadCount,
  getConversations,
  saveConversations,
  mergePolledMessages,
  countLoadedMessages,
  prependOlderMessages,
  findIncomingMessage,
} from "../src/services/chatService.js";

// Mock localStorage para os testes em Node.js
class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

globalThis.localStorage = new MockLocalStorage();
globalThis.window = {
  dispatchEvent: () => {},
};

test("formatação de hora de mensagem", () => {
  const dateIso = "2026-10-23T14:32:00.000Z";
  const formatted = formatMessageTime(dateIso);
  assert.ok(formatted.length > 0);
  assert.match(formatted, /\d{1,2}:\d{2}/);
});

test("formatação de data de conversa para hoje e ontem", () => {
  const now = new Date();
  const todayIso = now.toISOString();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayIso = yesterday.toISOString();

  assert.match(formatConversationDate(todayIso), /\d{1,2}:\d{2}/);
  assert.equal(formatConversationDate(yesterdayIso), "Ontem");
  assert.equal(formatDateDivider(todayIso), "Hoje");
  assert.equal(formatDateDivider(yesterdayIso), "Ontem");
});

test("novo usuário inicia sem conversas ou mensagens mocadas/hardcoded", () => {
  localStorage.clear();
  const initial = getConversations("user_123");
  assert.ok(Array.isArray(initial));
  assert.equal(initial.length, 0);
  assert.equal(getTotalUnreadCount("user_123"), 0);
});

test("criação de nova conversa e envio de mensagem com persistência", () => {
  localStorage.clear();
  const userId = "test_user_abc";

  const newCreator = {
    id: "creator_novo_99",
    name: "Arthur Pendelton",
    course: "Ciência da Computação",
    avatarUrl: null,
  };

  const createdConv = findOrCreateConversation(userId, newCreator);
  assert.ok(createdConv);
  assert.equal(createdConv.participant.name, "Arthur Pendelton");
  assert.equal(createdConv.participant.course, "Ciência da Computação");

  // Reencontrar a mesma conversa não duplica
  const foundConv = findOrCreateConversation(userId, newCreator);
  assert.equal(foundConv.id, createdConv.id);

  // Enviar mensagem
  const sendResult = addMessageToConversation(
    userId,
    createdConv.id,
    "Olá Arthur, tudo bem?",
    userId
  );

  assert.ok(sendResult);
  assert.equal(sendResult.message.text, "Olá Arthur, tudo bem?");
  assert.equal(sendResult.conversation.messages.length, 1);

  // Inicialmente o contador é zero (sem dados mocados)
  const baseUnread = getTotalUnreadCount(userId);
  assert.equal(baseUnread, 0);

  // Simular novas mensagens não lidas nesta conversa
  const convs = getConversations(userId);
  const target = convs.find((c) => c.id === createdConv.id);
  target.unreadCount = 3;
  saveConversations(userId, convs);
  assert.equal(getTotalUnreadCount(userId), 3);

  // Ao marcar como lida, remove as não lidas desta conversa
  markAsRead(userId, createdConv.id);
  assert.equal(getTotalUnreadCount(userId), 0);
});

test("busca periódica junta mensagens novas sem perder as que ainda estão sendo enviadas", () => {
  const sent = { id: "m1", senderId: "a", content: "oi", read: false };
  const pending = { id: "temp_1", senderId: "a", content: "tudo bem?", read: false };
  const reply = { id: "m2", senderId: "b", content: "oi!", read: false };

  // Chegou resposta nova e a mensagem pendente ainda não foi salva: entra a resposta, fica a pendente
  assert.deepEqual(mergePolledMessages([sent, pending], [sent, reply]), [sent, reply, pending]);

  // A pendente já foi salva no servidor: some a cópia temporária
  const saved = { id: "m3", senderId: "a", content: "tudo bem?", read: false };
  assert.deepEqual(mergePolledMessages([sent, pending], [sent, saved]), [sent, saved]);

  // Nada mudou: devolve a mesma lista (não redesenha)
  const current = [sent, reply];
  assert.equal(mergePolledMessages(current, [{ ...sent }, { ...reply }]), current);

  // Mensagem foi lida do outro lado: atualiza
  const read = mergePolledMessages(current, [{ ...sent, read: true }, reply]);
  assert.notEqual(read, current);
  assert.equal(read[0].read, true);
});

test("mensagens anteriores entram no começo e a busca periódica não as descarta", () => {
  const at = (min) => new Date(Date.UTC(2026, 9, 26, 12, min)).toISOString();
  const old1 = { id: "o1", senderId: "a", content: "antiga 1", createdAt: at(1) };
  const old2 = { id: "o2", senderId: "b", content: "antiga 2", createdAt: at(2) };
  const recent = { id: "r1", senderId: "a", content: "recente", createdAt: at(10) };
  const pending = { id: "temp_9", senderId: "a", content: "enviando", createdAt: at(11) };

  assert.equal(countLoadedMessages([recent, pending]), 1);

  // Botão: as anteriores entram antes, sem repetir a que já estava na tela
  const withOlder = prependOlderMessages([recent, pending], [old1, old2, recent]);
  assert.deepEqual(withOlder.map((m) => m.id), ["o1", "o2", "r1", "temp_9"]);

  // Busca periódica traz só as recentes: as anteriores já carregadas continuam
  const reply = { id: "r2", senderId: "b", content: "resposta", createdAt: at(12) };
  const merged = mergePolledMessages(withOlder, [recent, reply]);
  assert.deepEqual(merged.map((m) => m.id), ["o1", "o2", "r1", "r2", "temp_9"]);
});

test("aviso de mensagem nova só dispara para mensagem recebida, nova e não lida", () => {
  const me = "eu";
  const conv = (id, lastMessage) => ({ id, participant: { id: `p_${id}` }, lastMessage });
  const lastSeen = new Map([["c1", "m1"], ["c2", "m2"]]);

  // Nada mudou
  assert.equal(findIncomingMessage([conv("c1", { id: "m1", senderId: "x", read: false })], lastSeen, me), null);
  // Mensagem nova, mas fui eu que mandei
  assert.equal(findIncomingMessage([conv("c1", { id: "m9", senderId: me, read: false })], lastSeen, me), null);
  // Mensagem nova já lida (ex.: em outra aba)
  assert.equal(findIncomingMessage([conv("c1", { id: "m9", senderId: "x", read: true })], lastSeen, me), null);
  // Mensagem nova recebida e não lida, inclusive em conversa que não existia antes
  assert.equal(findIncomingMessage([conv("c2", { id: "m10", senderId: "x", read: false })], lastSeen, me)?.id, "c2");
  assert.equal(findIncomingMessage([conv("c3", { id: "m11", senderId: "x", read: false })], lastSeen, me)?.id, "c3");
});
