import { Link } from "react-router-dom";
import ConversationItem from "./ConversationItem";

export default function ConversationsSidebar({
  conversations = [],
  activeConversationId,
  onSelectConversation,
  searchQuery,
  onSearchChange,
}) {
  const hasConversations = conversations.length > 0;

  return (
    <aside className="chat-sidebar" aria-label="Lista de conversas">
      <div className="chat-sidebar__header">
        <div className="chat-sidebar__title-row">
          <h2 className="chat-sidebar__title">Mensagens</h2>
          <span className="chat-sidebar__count-badge">
            {conversations.length}
          </span>
        </div>

        <div className="chat-sidebar__search">
          <i
            className="fa-solid fa-magnifying-glass chat-sidebar__search-icon"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por nome do criador..."
            className="chat-sidebar__search-input"
            aria-label="Buscar conversas por criador"
          />
          {searchQuery && (
            <button
              type="button"
              className="chat-sidebar__search-clear"
              onClick={() => onSearchChange("")}
              aria-label="Limpar busca"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="chat-sidebar__list" role="list">
        {hasConversations ? (
          conversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isActive={conv.id === activeConversationId}
              onSelect={onSelectConversation}
            />
          ))
        ) : searchQuery ? (
          <div className="chat-sidebar__empty-search">
            <i className="fa-solid fa-user-slash" aria-hidden="true" />
            <p>Nenhuma conversa encontrada para "{searchQuery}"</p>
          </div>
        ) : (
          <div className="chat-sidebar__empty">
            <i className="fa-regular fa-comments" aria-hidden="true" />
            <p className="chat-sidebar__empty-title">
              Você ainda não iniciou nenhuma conversa.
            </p>
            <p className="chat-sidebar__empty-subtitle">
              Conecte-se com colegas desenvolvedores e troque ideias sobre projetos.
            </p>
            <Link to="/criadores" className="chat-sidebar__explore-link">
              <i className="fa-solid fa-user-group" aria-hidden="true" />
              Explorar Criadores
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
