import { formatMessageTime } from "../../services/chatService";

export default function MessageBubble({ message, isFromMe }) {
  const time = formatMessageTime(message.createdAt);

  return (
    <div
      className={`chat-message-row ${
        isFromMe ? "chat-message-row--sent" : "chat-message-row--received"
      }`}
    >
      <div
        className={`chat-message-bubble ${
          isFromMe ? "chat-message-bubble--sent" : "chat-message-bubble--received"
        }`}
      >
        <div className="chat-message-bubble__text">
          {message.text || message.content}
        </div>

        <div className="chat-message-bubble__meta">
          <span className="chat-message-bubble__time">{time}</span>
          {isFromMe && (
            <span
              className="chat-message-bubble__status"
              title={message.read ? "Lida" : "Enviada"}
            >
              <i
                className={`fa-solid ${
                  message.read ? "fa-check-double" : "fa-check"
                }`}
                aria-hidden="true"
              />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
