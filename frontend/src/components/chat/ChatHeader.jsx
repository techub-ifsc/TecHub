import { Link } from "react-router-dom";
import { useState } from "react";

export default function ChatHeader({ participant, onBack }) {
  if (!participant) return null;

  const profileUrl = `/criadores/${participant.id}`;
  const [imgError, setImgError] = useState(false);

  return (
    <header className="chat-window-header">
      <div className="chat-window-header__left">
        <button
          type="button"
          className="chat-window-header__back-btn"
          onClick={onBack}
          aria-label="Voltar para a lista de conversas"
          title="Voltar para conversas"
        >
          <i className="fa-solid fa-arrow-left" aria-hidden="true" />
          <span className="chat-window-header__back-text">Voltar</span>
        </button>

        <div className="chat-window-header__avatar-wrapper">
          {participant.avatarUrl && !imgError ? (
            <img
              src={participant.avatarUrl}
              alt=""
              className="chat-window-header__avatar"
              onError={() => setImgError(true)}
            />
          ) : (
            <span
              className="chat-window-header__fallback"
              style={{ backgroundColor: participant.color || "#356c74" }}
              aria-hidden="true"
            >
              {participant.initials || "?"}
            </span>
          )}
        </div>

        <div className="chat-window-header__info">
          <Link
            to={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="chat-window-header__name-link"
            title="Abrir perfil em nova aba"
          >
            <span className="chat-window-header__name">{participant.name}</span>
            <i
              className="fa-solid fa-arrow-up-right-from-square chat-window-header__external-icon"
              aria-hidden="true"
            />
          </Link>
          <span className="chat-window-header__course">
            {participant.course || "Estudante IFSC"}
          </span>
        </div>
      </div>

      <div className="chat-window-header__actions">
        <Link
          to={profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="chat-window-header__profile-btn"
        >
          <i className="fa-solid fa-folder-open" aria-hidden="true" />
          <span className="chat-window-header__action-text">Ver projetos</span>
        </Link>
      </div>
    </header>
  );
}
