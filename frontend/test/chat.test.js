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
