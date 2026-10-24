import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useChat } from "../context/ChatContext";
import { fetchPublicProfile } from "../api/userProfile";
import { fetchAllPublicProjects } from "../api/creators";
import { findCreator, getCreatorColor, getInitials } from "../utils/creators";
import ConversationsSidebar from "../components/chat/ConversationsSidebar";
import ChatWindow from "../components/chat/ChatWindow";
import "./MessagesPage.css";

export default function MessagesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const targetCreatorId = searchParams.get("with") || searchParams.get("userId");

  const {
    filteredConversations,
    activeConversation,
    activeConversationId,
    selectConversation,
    openConversationWithCreator,
    sendMessage,
    searchQuery,
    setSearchQuery,
  } = useChat();

  const [loadingRecipient, setLoadingRecipient] = useState(false);

  // Efeito para tratar o parâmetro de URL ?with=<creatorId> ou ?userId=<creatorId>
  useEffect(() => {
    if (!targetCreatorId) return;

    let active = true;

    async function resolveCreator() {
      try {
        setLoadingRecipient(true);

        // 1. Tenta buscar o perfil público
        let profile = null;
        try {
          profile = await fetchPublicProfile(targetCreatorId);
        } catch {
          // segue para fallback
        }

        if (profile && active) {
          openConversationWithCreator({
            id: targetCreatorId,
            name: profile.name || "Criador",
            course: profile.major || "Estudante IFSC",
            avatarUrl: profile.avatar_url || null,
            initials: getInitials(profile.name || "Criador"),
            color: getCreatorColor(targetCreatorId),
          });
          return;
        }

        // 2. Se não achar perfil em /users/:id, tenta achar nos projetos aprovados
        const projects = await fetchAllPublicProjects().catch(() => []);
        const creatorFromProjects = findCreator(projects, targetCreatorId);

        if (creatorFromProjects && active) {
          openConversationWithCreator({
            id: targetCreatorId,
            name: creatorFromProjects.name,
            course: creatorFromProjects.course || "Estudante IFSC",
            avatarUrl: creatorFromProjects.avatarUrl || null,
            initials: creatorFromProjects.initials,
            color: creatorFromProjects.color,
          });
          return;
        }

        // 3. Fallback genérico caso o criador não tenha projetos nem perfil público salvo ainda
        if (active) {
          openConversationWithCreator({
            id: targetCreatorId,
            name: "Criador",
            course: "Estudante IFSC",
            avatarUrl: null,
            initials: getInitials("Criador"),
            color: getCreatorColor(targetCreatorId),
          });
        }
      } catch (err) {
        console.error("Falha ao resolver criador para chat:", err);
      } finally {
        if (active) setLoadingRecipient(false);
      }
    }

    resolveCreator();

    return () => {
      active = false;
    };
  }, [targetCreatorId, openConversationWithCreator]);

  // Ação de voltar no mobile
  function handleBack() {
    selectConversation(null);
    if (searchParams.has("with") || searchParams.has("userId")) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("with");
      nextParams.delete("userId");
      setSearchParams(nextParams, { replace: true });
    }
  }

  // Ação de selecionar conversa pela sidebar
  function handleSelectConversation(convId) {
    selectConversation(convId);
    if (searchParams.has("with") || searchParams.has("userId")) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("with");
      nextParams.delete("userId");
      setSearchParams(nextParams, { replace: true });
    }
  }

  const hasActiveChat = Boolean(activeConversation);

  return (
    <div className={`chat-page ${hasActiveChat ? "has-active-chat" : "no-active-chat"}`}>
      <div className="chat-page__container">
        <ConversationsSidebar
          conversations={filteredConversations}
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <ChatWindow
          activeConversation={activeConversation}
          onBack={handleBack}
          onSendMessage={sendMessage}
        />
      </div>
    </div>
  );
}
