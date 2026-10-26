import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import { findIncomingMessage } from "../../services/chatService";
import "./ChatNotifier.css";

const PAGE_TITLE = "TecHub";
const NOTICE_DURATION_MS = 10000;

// Avisa de mensagem nova enquanto a pessoa navega pelo site e mostra as não lidas no título da aba.
export default function ChatNotifier() {
  const { user } = useAuth();
  const { conversations, conversationsReady, unreadCount } = useChat();
  const location = useLocation();
  const navigate = useNavigate();
  const [notice, setNotice] = useState(null);
  const [hovered, setHovered] = useState(false);
  const lastSeenRef = useRef(null);

  const onMessagesPage = location.pathname.startsWith("/mensagens");

  useEffect(() => {
    document.title = unreadCount > 0 ? `(${unreadCount}) ${PAGE_TITLE}` : PAGE_TITLE;
  }, [unreadCount]);

  useEffect(() => {
    if (!conversationsReady) {
      lastSeenRef.current = null;
      return;
    }

    const previous = lastSeenRef.current;
    lastSeenRef.current = new Map(conversations.map((c) => [c.id, c.lastMessage?.id ?? null]));

    // Na primeira carga só registra o que já existia; na página de mensagens a lista já mostra tudo.
    if (!previous || onMessagesPage) return;

    const incoming = findIncomingMessage(conversations, previous, user?.id);
    if (incoming) {
      setHovered(false);
      setNotice({
        id: incoming.lastMessage.id,
        participant: incoming.participant,
        text: incoming.lastMessage.text || incoming.lastMessage.content,
      });
    }
  }, [conversations, conversationsReady, onMessagesPage, user?.id]);

  useEffect(() => {
    if (onMessagesPage) {
      setNotice(null);
      setHovered(false);
    }
  }, [onMessagesPage]);

  // Some sozinho depois de um tempo, mas não enquanto o mouse estiver em cima
  useEffect(() => {
    if (!notice || hovered) return undefined;
    const timer = setTimeout(() => setNotice(null), NOTICE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [notice, hovered]);

  if (!notice) return null;

  function openConversation() {
    setNotice(null);
    setHovered(false);
    navigate(`/mensagens?with=${encodeURIComponent(notice.participant?.id || "")}`);
  }

  const name = notice.participant?.name || "um criador";

  return (
    <div
      className="chat-notice"
      role="status"
      aria-live="polite"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button type="button" className="chat-notice__body" onClick={openConversation}>
        <span className="chat-notice__title">Nova mensagem de {name}</span>
        <span className="chat-notice__text">{notice.text}</span>
      </button>
      <button
        type="button"
        className="chat-notice__close"
        aria-label="Fechar aviso"
        onClick={() => {
          setNotice(null);
          setHovered(false);
        }}
      >
        <i className="fa-solid fa-xmark" aria-hidden="true" />
      </button>
    </div>
  );
}
