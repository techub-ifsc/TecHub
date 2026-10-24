import { useEffect, useRef, useState } from "react";

export default function MessageInput({ participantName = "Criador", onSendMessage }) {
  const [text, setText] = useState("");
  const textareaRef = useRef(null);

  // Auto-expande a altura do textarea de 1 até aproximadamente 4 linhas
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const newHeight = Math.min(el.scrollHeight, 120);
    el.style.height = `${newHeight}px`;
  }, [text]);

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }

  function handleSubmit(event) {
    if (event) event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    onSendMessage(trimmed);
    setText("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }
  }

  const isValid = Boolean(text.trim());

  return (
    <form className="chat-message-input-form" onSubmit={handleSubmit}>
      <div className="chat-message-input-container">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Digite sua mensagem para ${participantName}...`}
          rows={1}
          className="chat-message-textarea"
          aria-label={`Mensagem para ${participantName}`}
        />

        <button
          type="submit"
          disabled={!isValid}
          className={`chat-message-send-btn ${isValid ? "is-ready" : ""}`}
          aria-label="Enviar mensagem"
          title={isValid ? "Enviar (Enter)" : "Digite uma mensagem"}
        >
          <i className="fa-solid fa-paper-plane" aria-hidden="true" />
        </button>
      </div>

      <div className="chat-message-input-hints">
        <span>
          Pressione <strong>Enter</strong> para enviar, <strong>Shift + Enter</strong> para quebrar linha
        </span>
      </div>
    </form>
  );
}
