import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./SendMessageButton.css";

export default function SendMessageButton({
  creatorId,
  creatorName = "Criador",
  isOwner = false,
  className = "",
  variant = "pill", // 'pill' | 'compact'
}) {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // Ocultar se for o próprio perfil do usuário logado
  if (isOwner || (user?.id && String(user.id) === String(creatorId))) {
    return null;
  }

  function handleClick(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!isAuthenticated) {
      navigate("/login", {
        state: {
          accessMessage: `Faça login na plataforma para enviar uma mensagem para ${creatorName}.`,
          from: { pathname: "/mensagens", search: `?with=${creatorId}` },
        },
      });
      return;
    }

    navigate(`/mensagens?with=${creatorId}`);
  }

  return (
    <button
      type="button"
      className={`techub-send-message-btn techub-send-message-btn--${variant} ${className}`}
      onClick={handleClick}
      aria-label={`Enviar mensagem para ${creatorName}`}
      title={`Conversar com ${creatorName}`}
    >
      <i className="fa-regular fa-comment-dots" aria-hidden="true" />
      <span>Enviar mensagem</span>
    </button>
  );
}
