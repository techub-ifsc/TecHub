import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import {
  fetchConversations,
  fetchConversationMessages,
  initConversationWithRecipient,
  sendConversationMessage,
} from "../api/chatApi";
import { connectSocket, disconnectSocket, getSocket } from "../services/socket";
import {
  addMessageToConversation,
  findConversationByParticipantId,
  findOrCreateConversation,
  getConversations as getLocalConversations,
  getTotalUnreadCount as getLocalTotalUnreadCount,
  markAsRead as markAsReadLocal,
  countLoadedMessages,
  mergePolledMessages,
  prependOlderMessages,
} from "../services/chatService";

const ChatContext = createContext(null);

const POLL_INTERVAL_MS = 5000;
// Mesmo padrão da API: o histórico vem de 50 em 50, das mais recentes para as mais antigas.
const MESSAGE_PAGE_SIZE = 50;

export function ChatProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id;

  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [activeMessages, setActiveMessages] = useState([]);
  const [draftParticipant, setDraftParticipant] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  // Fica true depois da primeira carga da lista; o aviso de mensagem nova só compara a partir daí.
  const [conversationsReady, setConversationsReady] = useState(false);
  const activeConversationIdRef = useRef(activeConversationId);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  // Recarrega as conversas do usuário autenticado (da API ou fallback local)
  const refresh = useCallback(async () => {
    if (!isAuthenticated || !userId) {
      setConversations([]);
      setUnreadCount(0);
      setConversationsReady(false);
      return;
    }

    try {
      const data = await fetchConversations();
      if (Array.isArray(data)) {
        setConversations(data);
        const total = data.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
        setUnreadCount(total);
        setConversationsReady(true);
        return;
      }
    } catch {
      // Fallback para storage local quando a API não estiver acessível
      const list = getLocalConversations(userId);
      setConversations(list);
      setUnreadCount(getLocalTotalUnreadCount(userId));
      setConversationsReady(true);
    }
  }, [isAuthenticated, userId]);

  // Trocou de conta (ou saiu): fecha a conexão da conta anterior antes de abrir a nova.
  useEffect(() => () => disconnectSocket(), [userId]);

  // Inicializa socket e carrega conversas quando autenticado
  useEffect(() => {
    if (!isAuthenticated || !userId) {
      disconnectSocket();
      setConversations([]);
      setUnreadCount(0);
      setActiveConversationId(null);
      setActiveMessages([]);
      setDraftParticipant(null);
      setConversationsReady(false);
      return;
    }

    refresh();

    // Conecta ao Socket.io
    const token = localStorage.getItem("token") || localStorage.getItem("techub_token");
    const socket = connectSocket(token);

    if (socket) {
      // Recebimento de nova mensagem em tempo real
      socket.on("new_message", (rawMessage) => {
        const message = {
          ...rawMessage,
          content: rawMessage.content || rawMessage.text || "",
          text: rawMessage.text || rawMessage.content || "",
        };

        // Se a mensagem for da conversa ativa atual
        setActiveConversationId((currentActiveId) => {
          if (currentActiveId === message.conversationId) {
            setActiveMessages((prev) => {
              // 1. Se essa mensagem definitiva já estiver na lista, não adiciona novamente
              if (prev.some((m) => m.id === message.id)) {
                return prev;
              }

              // 2. Se for uma mensagem que o próprio usuário enviou e houver a mensagem temporária otimista com tempId, substitui
              if (message.tempId) {
                const tempIdx = prev.findIndex((m) => m.id === message.tempId);
                if (tempIdx !== -1) {
                  const updated = [...prev];
                  updated[tempIdx] = message;
                  return updated;
                }
              }

              // 3. Fallback: se o remetente for o usuário atual e houver mensagem temporária com o mesmo texto
              if (String(message.senderId) === String(userId)) {
                const tempIdx = prev.findIndex(
                  (m) =>
                    typeof m.id === "string" &&
                    m.id.startsWith("temp_") &&
                    (m.content === message.content || m.text === message.text)
                );
                if (tempIdx !== -1) {
                  const updated = [...prev];
                  updated[tempIdx] = message;
                  return updated;
                }
              }

              return [...prev, message];
            });

            // Se o usuário atual for o destinatário e estiver com o chat aberto, marca como lido
            if (message.recipientId === userId) {
              socket.emit("mark_read", { conversationId: message.conversationId });
            }
          }
          return currentActiveId;
        });

        // Atualiza a sidebar de conversas
        setConversations((prevList) => {
          const list = [...prevList];
          const index = list.findIndex((c) => c.id === message.conversationId);

          if (index !== -1) {
            const current = list[index];
            const isCurrentlyActive = current.id === activeConversationId;
            const updated = {
              ...current,
              updatedAt: message.createdAt,
              lastMessage: {
                id: message.id,
                senderId: message.senderId,
                content: message.content,
                text: message.text || message.content,
                createdAt: message.createdAt,
                read: isCurrentlyActive ? true : Boolean(message.readAt),
              },
              unreadCount:
                !isCurrentlyActive && message.recipientId === userId
                  ? (current.unreadCount || 0) + 1
                  : current.unreadCount,
            };
            list.splice(index, 1);
            list.unshift(updated);
          } else {
            // Se não estava na lista, recarrega
            refresh();
          }

          return list;
        });

        // Atualiza contador global de não lidas se a mensagem não for para o chat ativo
        if (message.recipientId === userId && message.conversationId !== activeConversationId) {
          setUnreadCount((prev) => prev + 1);
        }
      });

      // Atualização de mensagens lidas em tempo real
      socket.on("messages_read", ({ conversationId }) => {
        setActiveMessages((prev) =>
          prev.map((m) => (m.conversationId === conversationId ? { ...m, read: true } : m))
        );
      });
    }

    return () => {
      if (socket) {
        socket.off("new_message");
        socket.off("messages_read");
      }
    };
  }, [isAuthenticated, userId, refresh, activeConversationId]);

  // Carrega as mensagens ao selecionar uma conversa
  useEffect(() => {
    setHasOlderMessages(false);

    if (!activeConversationId || !userId) {
      setActiveMessages([]);
      return;
    }

    let active = true;
    setLoadingMessages(true);

    async function loadMessages() {
      // Se for id de rascunho ou provisório (ex: "draft_..." ou "conv_..."), não faz request HTTP com UUID inválido
      if (activeConversationId.startsWith("draft_") || activeConversationId.startsWith("conv_")) {
        const conv = getLocalConversations(userId).find((c) => c.id === activeConversationId);
        if (active) {
          setActiveMessages(conv?.messages || []);
          setLoadingMessages(false);
        }
        return;
      }

      try {
        const msgs = await fetchConversationMessages(activeConversationId);
        if (active && Array.isArray(msgs)) {
          setActiveMessages(msgs);
          setHasOlderMessages(msgs.length >= MESSAGE_PAGE_SIZE);
          // O servidor marcou a conversa como lida: atualiza o total de não lidas do menu
          refresh();
        }
      } catch {
        // Fallback local
        const conv = getLocalConversations(userId).find((c) => c.id === activeConversationId);
        if (active && conv?.messages) {
          setActiveMessages(conv.messages);
        }
      } finally {
        if (active) setLoadingMessages(false);
      }
    }

    loadMessages();

    // Notifica servidor e limpa badge local
    const socket = getSocket();
    if (socket?.connected && !activeConversationId.startsWith("draft_") && !activeConversationId.startsWith("conv_")) {
      socket.emit("mark_read", { conversationId: activeConversationId });
    }
    markAsReadLocal(userId, activeConversationId);

    setConversations((prev) =>
      prev.map((c) => (c.id === activeConversationId ? { ...c, unreadCount: 0 } : c))
    );

    return () => {
      active = false;
    };
  }, [activeConversationId, userId, refresh]);

  // Sem o WebSocket (na Vercel não existe servidor de socket), busca as novidades na API
  // de tempos em tempos, só com a aba visível.
  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    let active = true;

    async function poll() {
      if (getSocket()?.connected || document.visibilityState !== "visible") return;

      const isServerConversation =
        activeConversationId &&
        !activeConversationId.startsWith("draft_") &&
        !activeConversationId.startsWith("conv_");

      if (isServerConversation) {
        try {
          const msgs = await fetchConversationMessages(activeConversationId);
          if (active && Array.isArray(msgs)) {
            setActiveMessages((prev) => mergePolledMessages(prev, msgs));
          }
        } catch {
          // Tenta de novo na próxima rodada
        }
      }

      if (active) refresh();
    }

    const timer = setInterval(poll, POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", poll);

    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [isAuthenticated, userId, activeConversationId, refresh]);

  // Busca as 50 mensagens anteriores às que já estão na tela
  const loadOlderMessages = useCallback(async () => {
    const convId = activeConversationId;
    if (!convId || convId.startsWith("draft_") || convId.startsWith("conv_") || loadingOlderMessages) return;

    setLoadingOlderMessages(true);
    try {
      const older = await fetchConversationMessages(convId, {
        offset: countLoadedMessages(activeMessages),
        limit: MESSAGE_PAGE_SIZE,
      });
      // Ignora a resposta se a pessoa já trocou de conversa
      if (activeConversationIdRef.current === convId && Array.isArray(older)) {
        setActiveMessages((prev) => prependOlderMessages(prev, older));
        setHasOlderMessages(older.length >= MESSAGE_PAGE_SIZE);
      }
    } catch {
      // Mantém o botão para tentar de novo
    } finally {
      setLoadingOlderMessages(false);
    }
  }, [activeConversationId, activeMessages, loadingOlderMessages]);

  // Conversa ativa selecionada com suas mensagens atualizadas
  const activeConversation = useMemo(() => {
    if (activeConversationId) {
      const found = conversations.find((c) => c.id === activeConversationId);
      if (found) {
        return {
          ...found,
          messages: activeMessages,
        };
      }
    }

    if (draftParticipant) {
      return {
        id: `draft_${draftParticipant.id}`,
        isDraft: true,
        participant: draftParticipant,
        unreadCount: 0,
        updatedAt: new Date().toISOString(),
        messages: activeMessages.length > 0 ? activeMessages : [],
      };
    }

    return null;
  }, [activeConversationId, conversations, draftParticipant, activeMessages]);

  // Seleciona uma conversa existente
  const selectConversation = useCallback(
    (convId) => {
      setDraftParticipant(null);
      setActiveConversationId(convId);
    },
    []
  );

  // Inicia ou abre conversa com um criador específico
  const openConversationWithCreator = useCallback(
    async (participant) => {
      if (!participant?.id || !userId) return;

      try {
        const data = await initConversationWithRecipient(participant.id);
        if (data?.id) {
          setDraftParticipant(null);
          setActiveConversationId(data.id);
          refresh();
          return;
        }
      } catch {
        // Fallback: abre em modo rascunho com o criador selecionado
        setDraftParticipant(participant);
        setActiveConversationId(`draft_${participant.id}`);
        setActiveMessages([]);
      }
    },
    [userId, refresh]
  );

  // Envio de mensagem com entrega instantânea e persistência
  const sendMessage = useCallback(
    async (text) => {
      const trimmed = text?.trim();
      if (!userId || !trimmed) return null;

      let targetConvId = activeConversationId;
      let targetRecipientId = activeConversation?.participant?.id || draftParticipant?.id;

      // Se for rascunho ou ID provisório ("conv_..."), garante a conversa no servidor
      const isProvisional =
        !targetConvId ||
        targetConvId.startsWith("draft_") ||
        targetConvId.startsWith("conv_");

      if (isProvisional && targetRecipientId) {
        try {
          const initRes = await initConversationWithRecipient(targetRecipientId);
          if (initRes?.id) {
            targetConvId = initRes.id;
            setActiveConversationId(initRes.id);
            setDraftParticipant(null);
          }
        } catch {
          if (!targetConvId || targetConvId.startsWith("draft_")) {
            const created = findOrCreateConversation(userId, activeConversation?.participant || draftParticipant);
            if (created) {
              targetConvId = created.id;
              setActiveConversationId(created.id);
              setDraftParticipant(null);
            }
          }
        }
      }

      if (!targetConvId) return null;

      const tempId = `temp_${Date.now()}`;
      const optimisticMessage = {
        id: tempId,
        conversationId: targetConvId,
        senderId: userId,
        recipientId: targetRecipientId,
        content: trimmed,
        text: trimmed,
        createdAt: new Date().toISOString(),
        readAt: null,
        read: false,
      };

      // Injeta otimisticamente na tela para resposta instantânea ("na hora que enviar")
      setActiveMessages((prev) => [...prev, optimisticMessage]);

      const socket = getSocket();

      // Envio via WebSocket com callback de confirmação
      if (socket?.connected) {
        socket.emit(
          "send_message",
          {
            conversationId: targetConvId,
            recipientId: targetRecipientId,
            content: trimmed,
            tempId,
          },
          (response) => {
            if (response?.status === "ok" && response.data) {
              const serverMsg = {
                ...response.data,
                content: response.data.content || response.data.text || trimmed,
                text: response.data.text || response.data.content || trimmed,
              };

              setActiveMessages((prev) => {
                // Se já foi substituído ou adicionado pelo evento new_message, remove tempId
                const alreadyExists = prev.some((m) => m.id === serverMsg.id);
                if (alreadyExists) {
                  return prev.filter((m) => m.id !== tempId);
                }
                return prev.map((m) => (m.id === tempId ? serverMsg : m));
              });
            }
          }
        );
      } else {
        // Envio via REST HTTP se o socket estiver desconectado
        try {
          const saved = await sendConversationMessage(targetConvId, trimmed);
          if (saved?.id) {
            const serverMsg = {
              ...saved,
              content: saved.content || saved.text || trimmed,
              text: saved.text || saved.content || trimmed,
            };
            setActiveMessages((prev) => {
              const alreadyExists = prev.some((m) => m.id === serverMsg.id);
              if (alreadyExists) {
                return prev.filter((m) => m.id !== tempId);
              }
              return prev.map((m) => (m.id === tempId ? serverMsg : m));
            });
          }
        } catch {
          // Fallback para storage local
          addMessageToConversation(userId, targetConvId, trimmed, userId);
        }
      }

      refresh();
      return optimisticMessage;
    },
    [userId, activeConversationId, activeConversation, draftParticipant, refresh]
  );

  // Filtra as conversas pela busca do cabeçalho da sidebar
  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) =>
      c.participant?.name?.toLowerCase().includes(q)
    );
  }, [conversations, searchQuery]);

  const value = {
    conversations,
    filteredConversations,
    activeConversation,
    activeConversationId,
    activeMessages,
    draftParticipant,
    unreadCount,
    searchQuery,
    loadingMessages,
    hasOlderMessages,
    loadingOlderMessages,
    conversationsReady,
    setSearchQuery,
    selectConversation,
    loadOlderMessages,
    openConversationWithCreator,
    sendMessage,
    refreshConversations: refresh,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat deve ser usado dentro de um ChatProvider");
  }
  return context;
}
