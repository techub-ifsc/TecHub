import { useLayoutEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import { formatDateDivider } from "../../services/chatService";
import { useAuth } from "../../context/AuthContext";

export default function MessageList({
  messages = [],
  participant,
  hasOlderMessages = false,
  loadingOlderMessages = false,
  onLoadOlderMessages,
}) {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const listRef = useRef(null);
  const bottomAnchorRef = useRef(null);
  const lastIdRef = useRef(null);
  const firstIdRef = useRef(null);
  const heightBeforeOlderRef = useRef(null);

  const firstId = messages[0]?.id ?? null;
  const lastId = messages[messages.length - 1]?.id ?? null;

  // Mensagem nova no fim: desce até ela. Mensagens anteriores no começo: mantém a posição
  // da leitura, em vez de pular para o topo ou para o fim.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (lastId !== lastIdRef.current) {
      bottomAnchorRef.current?.scrollIntoView({ behavior: lastIdRef.current ? "smooth" : "auto" });
    } else if (firstId !== firstIdRef.current && list && heightBeforeOlderRef.current !== null) {
      list.scrollTop += list.scrollHeight - heightBeforeOlderRef.current;
    }
    heightBeforeOlderRef.current = null;
    lastIdRef.current = lastId;
    firstIdRef.current = firstId;
  }, [firstId, lastId]);

  function handleLoadOlder() {
    heightBeforeOlderRef.current = listRef.current?.scrollHeight ?? null;
    onLoadOlderMessages?.();
  }

  // Agrupa mensagens por divisor de data garantindo unicidade de IDs
  const groupedElements = [];
  let lastDateKey = null;
  const seenIds = new Set();

  messages.forEach((msg) => {
    if (!msg || !msg.id || seenIds.has(msg.id)) return;
    seenIds.add(msg.id);

    const dateDivider = formatDateDivider(msg.createdAt);
    if (dateDivider !== lastDateKey) {
      lastDateKey = dateDivider;
      groupedElements.push({
        type: "divider",
        id: `divider_${msg.id}_${dateDivider}`,
        label: dateDivider,
      });
    }
    groupedElements.push({
      type: "message",
      id: msg.id,
      data: msg,
    });
  });

  return (
    <div className="chat-message-list" role="log" aria-live="polite" ref={listRef}>
      {hasOlderMessages && groupedElements.length > 0 && (
        <button
          type="button"
          className="chat-message-list__older"
          onClick={handleLoadOlder}
          disabled={loadingOlderMessages}
        >
          {loadingOlderMessages ? "Carregando..." : "Carregar mensagens anteriores"}
        </button>
      )}
      {groupedElements.length === 0 ? (
        <div className="chat-message-list__empty">
          <div className="chat-message-list__empty-avatar">
            {participant?.avatarUrl ? (
              <img src={participant.avatarUrl} alt="" />
            ) : (
              <span>{participant?.initials || "?"}</span>
            )}
          </div>
          <h4>Inicie uma nova conversa com {participant?.name || "este criador"}</h4>
          <p>
            Diga olá, elogie um projeto desenvolvido no IFSC ou convide para uma colaboração acadêmica!
          </p>
        </div>
      ) : (
        groupedElements.map((item) => {
          if (item.type === "divider") {
            return (
              <div key={item.id} className="chat-date-divider">
                <span className="chat-date-divider__text">{item.label}</span>
              </div>
            );
          }

          const isFromMe = String(item.data.senderId) === String(currentUserId);
          return (
            <MessageBubble
              key={item.id}
              message={item.data}
              isFromMe={isFromMe}
            />
          );
        })
      )}
      <div ref={bottomAnchorRef} aria-hidden="true" />
    </div>
  );
}
