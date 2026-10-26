import { formatConversationDate } from "../../services/chatService";
import { useAuth } from "../../context/AuthContext";
import { useState } from "react";

export default function ConversationItem({ conversation, isActive, onSelect }) {
  const { user } = useAuth();
  const currentUserId = user?.id;

  const { participant, messages, unreadCount, updatedAt } = conversation;
  // A API manda só a última mensagem; o modo local (sem servidor) guarda a lista inteira.
  const lastMessage =
    conversation.lastMessage || (messages?.length ? messages[messages.length - 1] : null);

  const isFromMe = lastMessage && String(lastMessage.senderId) === String(currentUserId);
  const timeDisplay = formatConversationDate(lastMessage?.createdAt || updatedAt);
  const [imgError, setImgError] = useState(false);

  return (
    <button
      type="button"
      className={`chat-conversation-item ${isActive ? "is-active" : ""}`}
      onClick={() => onSelect(conversation.id)}
      aria-selected={isActive}
    >
      <div className="chat-conversation-item__avatar-wrapper">
        {participant?.avatarUrl && !imgError ? (
          <img
            src={participant.avatarUrl}
            alt=""
            className="chat-conversation-item__avatar"
            onError={() => setImgError(true)}
          />
        ) : (
          <span
            className="chat-conversation-item__fallback"
            style={{ backgroundColor: participant?.color || "#356c74" }}
            aria-hidden="true"
          >
            {participant?.initials || "?"}
          </span>
        )}

        <span
          className={`chat-conversation-item__status ${participant?.isOnline ? "is-online" : "is-offline"
            }`}
          title={participant?.isOnline ? "Online" : "Offline"}
        />
      </div>

      <div className="chat-conversation-item__content">
        <div className="chat-conversation-item__header">
          <span className="chat-conversation-item__name">
            {participant?.name || "Criador"}
          </span>
          <span className="chat-conversation-item__time">{timeDisplay}</span>
        </div>

        <div className="chat-conversation-item__footer">
          <p className="chat-conversation-item__preview">
            {lastMessage ? (
              <>
                {isFromMe && (
                  <span className="chat-conversation-item__prefix">Você: </span>
                )}
                {lastMessage.text || lastMessage.content}
              </>
            ) : (
              <span className="chat-conversation-item__empty-preview">
                Nenhuma mensagem enviada ainda
              </span>
            )}
          </p>

          {unreadCount > 0 && (
            <span
              className="chat-conversation-item__unread-badge"
              title={`${unreadCount} mensagem(ns) não lida(s)`}
            >
              {unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
