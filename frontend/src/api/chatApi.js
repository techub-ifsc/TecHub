import axiosClient from './axiosClient';

// 2.1 Listar conversas do usuário autenticado
export async function fetchConversations() {
  const { data } = await axiosClient.get('/chat/conversations');
  return data;
}

// 2.2 Obter histórico de mensagens de uma conversa
export async function fetchConversationMessages(conversationId, params = {}) {
  const { data } = await axiosClient.get(`/chat/conversations/${conversationId}/messages`, {
    params,
  });
  return data;
}

// 2.3 Iniciar ou obter conversa existente com outro criador
export async function initConversationWithRecipient(recipientId) {
  const { data } = await axiosClient.post('/chat/conversations/init', {
    recipientId,
  });
  return data;
}

// 2.4 Enviar mensagem via HTTP (REST fallback)
export async function sendConversationMessage(conversationId, content) {
  const { data } = await axiosClient.post(`/chat/conversations/${conversationId}/messages`, {
    content,
  });
  return data;
}
