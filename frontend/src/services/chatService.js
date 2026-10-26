import { getInitials, getCreatorColor } from "../utils/creators.js";

const STORAGE_PREFIX = "techub_chat_v1_";

// Formatação amigável de data e hora para o chat
export function formatMessageTime(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatConversationDate(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const messageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffTime = today.getTime() - messageDay.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return formatMessageTime(isoString);
  }
  if (diffDays === 1) {
    return "Ontem";
  }
  if (diffDays < 7) {
    return date.toLocaleDateString("pt-BR", { weekday: "short" });
  }
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function formatDateDivider(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const messageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffTime = today.getTime() - messageDay.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";

  return date.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

// Retorna todas as conversas do usuário ordenadas por atividade recente
export function getConversations(userId) {
  if (!userId) return [];
  const key = `${STORAGE_PREFIX}${userId}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Remove qualquer resquício de dados mocados gravados anteriormente em sessões passadas
    const cleaned = parsed.filter(
      (c) =>
        c?.id !== "conv_mariana_costa" &&
        c?.id !== "conv_lucas_almeida" &&
        c?.participant?.id !== "creator_mariana_costa" &&
        c?.participant?.id !== "creator_lucas_almeida"
    );

    if (cleaned.length !== parsed.length) {
      localStorage.setItem(key, JSON.stringify(cleaned));
    }

    return cleaned.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  } catch (error) {
    console.error("Erro ao carregar conversas do localStorage:", error);
    return [];
  }
}

export function saveConversations(userId, conversations) {
  if (!userId) return;
  const key = `${STORAGE_PREFIX}${userId}`;
  try {
    localStorage.setItem(key, JSON.stringify(conversations));
    window.dispatchEvent(new CustomEvent("techub_chat_update", { detail: { userId } }));
  } catch (error) {
    console.error("Erro ao salvar conversas no localStorage:", error);
  }
}

export function findConversationByParticipantId(userId, participantId) {
  if (!userId || !participantId) return null;
  const conversations = getConversations(userId);
  return (
    conversations.find(
      (c) => String(c.participant?.id) === String(participantId)
    ) || null
  );
}

export function findOrCreateConversation(userId, participant) {
  if (!userId || !participant?.id) return null;
  const conversations = getConversations(userId);
  const existing = conversations.find(
    (c) => String(c.participant?.id) === String(participant.id)
  );

  if (existing) return existing;

  const newConv = {
    id: `conv_${participant.id}_${Date.now()}`,
    participant: {
      id: participant.id,
      name: participant.name || "Criador",
      course: participant.course || participant.major || "Estudante IFSC",
      avatarUrl: participant.avatarUrl || participant.avatar_url || null,
      initials: participant.initials || getInitials(participant.name || "Criador"),
      color: participant.color || getCreatorColor(participant.id),
    },
    unreadCount: 0,
    updatedAt: new Date().toISOString(),
    messages: [],
  };

  const updated = [newConv, ...conversations];
  saveConversations(userId, updated);
  return newConv;
}

export function addMessageToConversation(userId, conversationId, text, senderId) {
  if (!userId || !conversationId || !text?.trim()) return null;

  const conversations = getConversations(userId);
  const convIndex = conversations.findIndex((c) => c.id === conversationId);

  if (convIndex === -1) return null;

  const nowIso = new Date().toISOString();
  const newMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    senderId: senderId || userId,
    text: text.trim(),
    createdAt: nowIso,
    read: true,
  };

  const currentConv = conversations[convIndex];
  const updatedConv = {
    ...currentConv,
    updatedAt: nowIso,
    messages: [...currentConv.messages, newMessage],
  };

  conversations.splice(convIndex, 1);
  const updatedList = [updatedConv, ...conversations];

  saveConversations(userId, updatedList);
  return { conversation: updatedConv, message: newMessage };
}

export function markAsRead(userId, conversationId) {
  if (!userId || !conversationId) return;
  const conversations = getConversations(userId);
  const conv = conversations.find((c) => c.id === conversationId);
  if (!conv || conv.unreadCount === 0) return;

  conv.unreadCount = 0;
  conv.messages = conv.messages.map((m) => ({ ...m, read: true }));

  saveConversations(userId, conversations);
}

export function getTotalUnreadCount(userId) {
  if (!userId) return 0;
  const conversations = getConversations(userId);
  return conversations.reduce((total, conv) => total + (conv.unreadCount || 0), 0);
}

const isPendingMessage = (m) => typeof m.id === "string" && m.id.startsWith("temp_");

// Junta a lista que veio da API com a da tela: mantém as mensagens anteriores já carregadas
// pelo botão e as que ainda estão sendo enviadas (temp_), e devolve a mesma lista quando
// nada mudou, para não redesenhar à toa.
export function mergePolledMessages(current, fromServer) {
  const serverIds = new Set(fromServer.map((m) => m.id));
  const oldestFromServer = fromServer.length ? new Date(fromServer[0].createdAt) : null;
  const olderLoaded = oldestFromServer
    ? current.filter(
        (m) => !isPendingMessage(m) && !serverIds.has(m.id) && new Date(m.createdAt) < oldestFromServer
      )
    : [];
  const pending = current.filter(
    (m) =>
      isPendingMessage(m) &&
      !fromServer.some((s) => String(s.senderId) === String(m.senderId) && s.content === m.content)
  );
  const next = [...olderLoaded, ...fromServer, ...pending];

  const unchanged =
    next.length === current.length &&
    next.every((m, i) => m.id === current[i].id && Boolean(m.read) === Boolean(current[i].read));
  return unchanged ? current : next;
}

// Quantas mensagens da conversa já vieram do servidor (serve de offset para buscar as anteriores).
export function countLoadedMessages(messages) {
  return messages.filter((m) => !isPendingMessage(m)).length;
}

// Coloca as mensagens anteriores no começo, sem repetir as que já estão na tela.
export function prependOlderMessages(current, older) {
  const ids = new Set(current.map((m) => m.id));
  return [...older.filter((m) => !ids.has(m.id)), ...current];
}

// Acha a conversa cuja última mensagem é nova (diferente da vista antes), veio da outra pessoa
// e ainda não foi lida. `lastSeen` é um Map conversa → id da última mensagem.
export function findIncomingMessage(conversations, lastSeen, currentUserId) {
  return (
    conversations.find(
      (c) =>
        c.lastMessage &&
        c.lastMessage.id !== lastSeen.get(c.id) &&
        String(c.lastMessage.senderId) !== String(currentUserId) &&
        !c.lastMessage.read
    ) || null
  );
}
