import EmptyChatState from "./EmptyChatState";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

export default function ChatWindow({
  activeConversation,
  onBack,
  onSendMessage,
}) {
  if (!activeConversation) {
    return (
      <main className="chat-window chat-window--empty">
        <EmptyChatState />
      </main>
    );
  }

  const { participant, messages } = activeConversation;

  return (
    <main className="chat-window chat-window--active">
      <ChatHeader participant={participant} onBack={onBack} />
      <MessageList messages={messages} participant={participant} />
      <MessageInput
        participantName={participant?.name || "Criador"}
        onSendMessage={onSendMessage}
      />
    </main>
  );
}
