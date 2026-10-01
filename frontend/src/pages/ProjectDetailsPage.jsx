import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import "./ProjectDetailsPage.css";

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

export default function ProjectDetailsPage() {
  const { id } = useParams();

  const [expanded, setExpanded] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

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
      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [selectedImage]);

  return (
    <main className="project-details-page">
      <div className="project-details-page__container">
        <Link
          to="/projetos"
          className="project-details-page__back"
        >
          <i
            className="fa-solid fa-arrow-left"
            aria-hidden="true"
          />

          Voltar para projetos
        </Link>

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
              <i
                className="fa-brands fa-github"
                aria-hidden="true"
              />

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
                className={`project-details-description${
                  expanded ? " is-expanded" : ""
                }`}
              >
                {PROJECT.description.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}

                <h3>Objetivos</h3>

                <ul>
                  <li>
                    Centralizar informações acadêmicas em
                    uma interface intuitiva.
                  </li>

                  <li>
                    Facilitar o acompanhamento de atividades
                    e prazos.
                  </li>

                  <li>
                    Aplicar boas práticas de acessibilidade e
                    responsividade.
                  </li>
                </ul>
              </div>

              <button
                type="button"
                className="project-details-expand"
                onClick={() =>
                  setExpanded((currentValue) => !currentValue)
                }
                aria-expanded={expanded}
              >
                {expanded
                  ? "Ver menos"
                  : "Ver descrição completa"}

                <i
                  className={`fa-solid fa-chevron-${
                    expanded ? "up" : "down"
                  }`}
                  aria-hidden="true"
                />
              </button>
            </section>

            <section className="project-details-card">
              <div className="project-details-card__header">
                <div>
                  <h2>Galeria do projeto</h2>

                  <p>
                    Clique em uma imagem para ampliar
                  </p>
                </div>
              </div>

              <div className="project-gallery">
                {PROJECT.gallery.map((image, index) => (
                  <button
                    type="button"
                    key={image.id}
                    className={`project-gallery__item ${
                      image.className
                    }${
                      index === 0 ? " is-featured" : ""
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
                  <span key={technology}>
                    {technology}
                  </span>
                ))}
              </div>
            </section>

            <section className="project-details-card project-details-sidebar__section">
              <h2>Colaboradores</h2>

              <div className="project-collaborators">
                {PROJECT.collaborators.map((person) => (
                  <div
                    className="project-collaborator"
                    key={person.id}
                  >
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
            <i
              className="fa-solid fa-chevron-left"
              aria-hidden="true"
            />
          </button>

          <div
            className={`project-lightbox__image ${selectedImage.className}`}
          >
            <span>{selectedImage.title}</span>
          </div>

          <button
            type="button"
            className="project-lightbox__arrow is-right"
            onClick={() => moveGallery(1)}
            aria-label="Próxima imagem"
          >
            <i
              className="fa-solid fa-chevron-right"
              aria-hidden="true"
            />
          </button>
        </div>
      )}
    </main>
  );
}