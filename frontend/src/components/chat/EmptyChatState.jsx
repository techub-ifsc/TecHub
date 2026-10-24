import { Link } from "react-router-dom";

export default function EmptyChatState() {
  return (
    <div className="chat-empty-state">
      <div className="chat-empty-state__icon-container">
        <i className="fa-regular fa-comments chat-empty-state__icon" aria-hidden="true" />
      </div>

      <h3 className="chat-empty-state__title">Não há conversas recentes</h3>

      <p className="chat-empty-state__subtitle">
        Selecione um criador na lista ao lado ou visite o perfil de um colega para iniciar uma nova conversa.
      </p>

      <Link to="/criadores" className="chat-empty-state__action-btn">
        <i className="fa-solid fa-compass" aria-hidden="true" />
        <span>Conhecer criadores</span>
      </Link>
    </div>
  );
}
