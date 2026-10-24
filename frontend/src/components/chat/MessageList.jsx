import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import { formatDateDivider } from "../../services/chatService";
import { useAuth } from "../../context/AuthContext";

export default function MessageList({ messages = [], participant }) {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const bottomAnchorRef = useRef(null);

  // Auto-scroll para o final da lista sempre que messages mudar
  useEffect(() => {
    bottomAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    <div className="chat-message-list" role="log" aria-live="polite">
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
