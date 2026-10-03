import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import "./ProjectDetailsPage.css";

function CheckIcon({ color = "#9EE64D", size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3.2 8.2L6.5 11.2L12.8 4.8"
        stroke={color}
        strokeWidth="1.44"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BanIcon({ color = "#E76A6A", size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="8"
        cy="8"
        r="5.5"
        stroke={color}
        strokeWidth="1.2"
      />
      <path
        d="M4 4L12 12"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="8"
        cy="8"
        r="5.4"
        stroke="#9EE64D"
        strokeWidth="1.2"
      />
      <path
        d="M8 4.8V8L10.16 9.44"
        stroke="#9EE64D"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RejectButton({ selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        border
        border-[#E76A6A]
        flex
        items-center
        justify-center
        gap-[8px]
        min-w-[184px]
        w-[184px]
        px-[20px]
        py-[10px]
        rounded-[6px]
        cursor-pointer
        transition-all
        duration-200
        ${selected
          ? "bg-[#2B1C1C]"
          : "bg-transparent hover:bg-[#211919]"
        }
      `}
    >
      <BanIcon />
      <span
        className="
          text-[#E76A6A]
          text-[12px]
          font-semibold
          uppercase
          tracking-[0.3px]
          whitespace-nowrap
        "
      >
        [ Reprovar ]
      </span>
    </button>
  );
}

function ApproveButton({ selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        border
        border-[#5D8F31]
        flex
        items-center
        justify-center
        gap-[8px]
        min-w-[184px]
        w-[184px]
        px-[20px]
        py-[10px]
        rounded-[6px]
        cursor-pointer
        transition-all
        duration-200
        ${selected
          ? "bg-[#9EE64D]"
          : "bg-transparent hover:bg-[#182016]"
        }
      `}
    >
      <CheckIcon color={selected ? "#17200F" : "#9EE64D"} />
      <span
        className={`
          text-[12px]
          font-semibold
          uppercase
          tracking-[0.3px]
          whitespace-nowrap
          ${selected
            ? "text-[#17200F]"
            : "text-[#9EE64D]"
          }
        `}
      >
        [ Aprovar ]
      </span>
    </button>
  );
}

const PROJECT = {
  id: 1,
  title: "Sistema de Gestão Acadêmica",
  summary:
    "Uma plataforma web para organizar atividades, notas e informações acadêmicas de estudantes do IFSC.",
  course: "Ciência da Computação",
  phase: "7ª Fase",
  status: "Em desenvolvimento",
  updatedAt: "Atualizado em 18 de setembro de 2026",

  technologies: [
    "React",
    "JavaScript",
    "Node.js",
    "Express",
    "PostgreSQL",
    "Figma",
  ],

  description: [
    "O projeto nasceu da necessidade de reunir, em um único ambiente, informações que normalmente ficam espalhadas entre diferentes ferramentas. A proposta é oferecer uma experiência simples para estudantes e professores.",
    "A aplicação permite acompanhar atividades, visualizar prazos, organizar disciplinas e consultar o desempenho acadêmico. A interface foi construída com foco em acessibilidade, responsividade e clareza visual.",
  ],

  collaborators: [
    {
      id: 1,
      name: "Antoni Ferraz",
      role: "Front-end",
      initials: "AF",
      color: "#315b92",
    },
    {
      id: 2,
      name: "Gabriela Rodrigues",
      role: "UX/UI",
      initials: "GR",
      color: "#8b3a57",
    },
    {
      id: 3,
      name: "Sérgio Tanque",
      role: "Back-end",
      initials: "ST",
      color: "#94602e",
    },
  ],

  gallery: [
    {
      id: 1,
      title: "Painel principal",
      className: "is-dashboard",
    },
    {
      id: 2,
      title: "Organização das disciplinas",
      className: "is-courses",
    },
    {
      id: 3,
      title: "Visão das atividades",
      className: "is-tasks",
    },
  ],

  github: "https://github.com/techub-ifsc/TecHub",
  demo: "https://github.com/techub-ifsc/TecHub",
};

export default function ProjectAproval() {
  const { id } = useParams();

  const [decision, setDecision] = useState(null);
  const [observation, setObservation] = useState("");

  const [expanded, setExpanded] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const handleConfirm = () => {
    if (!decision) {
      alert("Selecione Aprovar ou Reprovar.");
      return;
    }

    if (decision === "reprovar" && observation.trim() === "") {
      alert("O motivo da reprovação é obrigatório.");
      return;
    }

    if (decision === "aprovar") {
      alert("Projeto aprovado com sucesso!");
      return;
    }

    if (decision === "reprovar") {
      alert(`Projeto reprovado com sucesso!\n\nMotivo:\n${observation}`);
    }
  };

  function moveGallery(direction) {
    setSelectedImage((currentImage) => {
      if (!currentImage) {
        return PROJECT.gallery[0];
      }

      const currentIndex = PROJECT.gallery.findIndex(
        (image) => image.id === currentImage.id,
      );

      const nextIndex =
        (currentIndex + direction + PROJECT.gallery.length) %
        PROJECT.gallery.length;

      return PROJECT.gallery[nextIndex];
    });
  }

  useEffect(() => {
    function handleKeyDown(event) {
      if (!selectedImage) {
        return;
      }

      if (event.key === "Escape") {
        setSelectedImage(null);
      }

      if (event.key === "ArrowRight") {
        moveGallery(1);
      }

      if (event.key === "ArrowLeft") {
        moveGallery(-1);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedImage]);

  return (
    <main className="project-details-page">
      <div className="project-details-page__container">
        <Link to="/projetos" className="project-details-page__back">
          <i className="fa-solid fa-arrow-left" aria-hidden="true" />
          Voltar para projetos
        </Link>

        {/* PAINEL DE APROVAÇÃO / REVISÃO */}
        <section className="review-panel">
          {/* TOPO: Título e Identificação */}
          <div className="review-panel__header">
            <div>
              <h1 className="review-panel__title">Painel de revisão</h1>
              <p className="review-panel__subtitle">Administração do projeto</p>
            </div>

            <div className="review-panel__meta-info">
              <p>
                Projeto: <span>{PROJECT.title}</span>
              </p>
              <p>
                Aluno: <span>{PROJECT.collaborators[0]?.name}</span>
              </p>
            </div>
          </div>

          {/* BARRA DE STATUS / PRAZOS */}
          <div className="review-panel__status-bar">
            <div className="review-panel__status-badge-container">
              <span className="review-panel__label">Status do projeto:</span>
              <div className="review-panel__badge">
                <CheckIcon color="#17200F" />
                <span>Em análise</span>
              </div>
            </div>

            <div className="review-panel__date-info">
              <span className="review-panel__label">Data de envio:</span>
              <span className="review-panel__value">15/10/2026 às 14:30</span>
              <span className="review-panel__bullet">•</span>
              <span className="review-panel__label">{PROJECT.phase}</span>
            </div>

            <div className="review-panel__timer">
              <ClockIcon />
              <span>Prazo restante: 3 dias</span>
            </div>
          </div>

          {/* ÁREA DE DECISÃO E FORMULÁRIO */}
          <div className="review-panel__body">
            <div className="review-panel__actions">
              <button
                type="button"
                onClick={() => setDecision("reprovar")}
                className={`review-btn review-btn--reject ${decision === "reprovar" ? "is-selected" : ""}`}
              >
                <BanIcon />
                <span>[ Reprovar ]</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision("aprovar")}
                className={`review-btn review-btn--approve ${decision === "aprovar" ? "is-selected" : ""}`}
              >
                <CheckIcon color={decision === "aprovar" ? "#17200F" : "#9EE64D"} />
                <span>[ Aprovar ]</span>
              </button>
            </div>

            <div className="review-panel__observation">
              <p className="review-panel__obs-label">
                {decision === "reprovar"
                  ? "Explique o motivo da reprovação (obrigatório)"
                  : "Adicione uma observação para o aluno (opcional)"}
              </p>

              <textarea
                value={observation}
                onChange={(event) => setObservation(event.target.value)}
                placeholder={
                  decision === "reprovar"
                    ? "Digite o motivo da reprovação..."
                    : "Digite uma observação para o aluno..."
                }
                className="review-panel__textarea"
              />
            </div>

            <div className="review-panel__submit-wrapper">
              <button
                type="button"
                disabled={!decision}
                onClick={handleConfirm}
                className={`review-submit-btn ${!decision
                    ? "is-disabled"
                    : decision === "reprovar"
                      ? "is-reject"
                      : "is-approve"
                  }`}
              >
                {decision === "reprovar" && <BanIcon color="white" />}
                {decision === "aprovar" && <CheckIcon color="white" />}
                {!decision && <span>[ Selecione uma decisão ]</span>}
                {decision === "reprovar" && <span>[ Confirmar reprovação ]</span>}
                {decision === "aprovar" && <span>[ Confirmar aprovação ]</span>}
              </button>
            </div>
          </div>
        </section>

        {/* HERO E DETALHES DO PROJETO */}
        <header className="project-details-hero">
          <div className="project-details-hero__content">
            <div className="project-details-hero__meta">
              <span className="project-details-status">
                <span aria-hidden="true" />
                {PROJECT.status}
              </span>
              <span>{PROJECT.course}</span>
              <span>{PROJECT.phase}</span>
            </div>

            <h1>{PROJECT.title}</h1>
            <p>{PROJECT.summary}</p>
            <small>
              {PROJECT.updatedAt} · Projeto #{id ?? PROJECT.id}
            </small>
          </div>

          <div className="project-details-hero__actions">
            <a
              href={PROJECT.demo}
              target="_blank"
              rel="noreferrer"
              className="project-details-primary-button"
            >
              <i
                className="fa-solid fa-arrow-up-right-from-square"
                aria-hidden="true"
              />
              Ver demonstração
            </a>

            <a
              href={PROJECT.github}
              target="_blank"
              rel="noreferrer"
              className="project-details-secondary-button"
            >
              <i className="fa-brands fa-github" aria-hidden="true" />
              Repositório
            </a>
          </div>
        </header>

        <div className="project-details-layout">
          <div className="project-details-main">
            <section className="project-details-card">
              <div className="project-details-card__header">
                <h2>Sobre o projeto</h2>
              </div>

              <div
                className={`project-details-description${expanded ? " is-expanded" : ""
                  }`}
              >
                {PROJECT.description.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}

                <h3>Objetivos</h3>
                <ul>
                  <li>
                    Centralizar informações acadêmicas em uma interface
                    intuitiva.
                  </li>
                  <li>
                    Facilitar o acompanhamento de atividades e prazos.
                  </li>
                  <li>
                    Aplicar boas práticas de acessibilidade e responsividade.
                  </li>
                </ul>
              </div>

              <button
                type="button"
                className="project-details-expand"
                onClick={() => setExpanded((currentValue) => !currentValue)}
                aria-expanded={expanded}
              >
                {expanded ? "Ver menos" : "Ver descrição completa"}
                <i
                  className={`fa-solid fa-chevron-${expanded ? "up" : "down"
                    }`}
                  aria-hidden="true"
                />
              </button>
            </section>

            <section className="project-details-card">
              <div className="project-details-card__header">
                <div>
                  <h2>Galeria do projeto</h2>
                  <p>Clique em uma imagem para ampliar</p>
                </div>
              </div>

              <div className="project-gallery">
                {PROJECT.gallery.map((image, index) => (
                  <button
                    type="button"
                    key={image.id}
                    className={`project-gallery__item ${image.className}${index === 0 ? " is-featured" : ""
                      }`}
                    onClick={() => setSelectedImage(image)}
                    aria-label={`Ampliar ${image.title}`}
                  >
                    <span
                      className="project-gallery__mock-window"
                      aria-hidden="true"
                    >
                      <i />
                      <i />
                      <i />
                    </span>
                    <strong>{image.title}</strong>
                    <span
                      className="project-gallery__zoom"
                      aria-hidden="true"
                    >
                      <i className="fa-solid fa-magnifying-glass-plus" />
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <aside className="project-details-sidebar">
            <section className="project-details-card project-details-sidebar__section">
              <h2>Tecnologias</h2>
              <div className="project-details-tags">
                {PROJECT.technologies.map((technology) => (
                  <span key={technology}>{technology}</span>
                ))}
              </div>
            </section>

            <section className="project-details-card project-details-sidebar__section">
              <h2>Colaboradores</h2>
              <div className="project-collaborators">
                {PROJECT.collaborators.map((person) => (
                  <div className="project-collaborator" key={person.id}>
                    <span
                      style={{
                        "--avatar-color": person.color,
                      }}
                      aria-hidden="true"
                    >
                      {person.initials}
                    </span>
                    <div>
                      <strong>{person.name}</strong>
                      <small>{person.role}</small>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>

      {selectedImage && (
        <div
          className="project-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`Visualização: ${selectedImage.title}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedImage(null);
            }
          }}
        >
          <button
            type="button"
            className="project-lightbox__close"
            onClick={() => setSelectedImage(null)}
            aria-label="Fechar galeria"
            title="Fechar"
          >
            ×
          </button>

          <button
            type="button"
            className="project-lightbox__arrow is-left"
            onClick={() => moveGallery(-1)}
            aria-label="Imagem anterior"
          >
            <i className="fa-solid fa-chevron-left" aria-hidden="true" />
          </button>

          <div className={`project-lightbox__image ${selectedImage.className}`}>
            <span>{selectedImage.title}</span>
          </div>

          <button
            type="button"
            className="project-lightbox__arrow is-right"
            onClick={() => moveGallery(1)}
            aria-label="Próxima imagem"
          >
            <i className="fa-solid fa-chevron-right" aria-hidden="true" />
          </button>
        </div>
      )}
    </main>
  );
}