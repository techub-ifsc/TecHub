import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { API_URL } from "../api/apiUrl";
import { getYoutubeVideoId } from "../utils/youtube";
import "./ProjectDetailsPage.css";

const LONG_DESCRIPTION_LENGTH = 400;

// Links informados pelo usuário só são exibidos se forem http(s),
// evitando URLs como "javascript:" no href.
function safeExternalUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

function formatUpdatedAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `Atualizado em ${date.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })}`;
}

function getInitials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

export default function ProjectDetailsPage() {
  const { id } = useParams();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(null);

  useEffect(() => {
    async function loadProject() {
      try {
        setLoading(true);
        setError("");
        setSelectedIndex(null);

        const response = await fetch(`${API_URL}/projects/${id}`);

        if (response.status === 404) {
          setError("Projeto não encontrado.");
          return;
        }

        if (!response.ok) {
          throw new Error("Erro ao buscar projeto");
        }

        const data = await response.json();
        setProject(data.project);
      } catch (err) {
        console.error("Falha ao carregar projeto:", err);
        setError("Não foi possível carregar o projeto. Verifique se o servidor está ativo.");
      } finally {
        setLoading(false);
      }
    }

    loadProject();
  }, [id]);

  const media = project?.media || [];
  const images = media.filter((item) => item.mediaType === "image");
  const selectedImage = selectedIndex === null ? null : images[selectedIndex];

  function moveGallery(direction) {
    setSelectedIndex((currentIndex) =>
      currentIndex === null
        ? 0
        : (currentIndex + direction + images.length) % images.length
    );
  }

  useEffect(() => {
    function handleKeyDown(event) {
      if (selectedIndex === null) {
        return;
      }

      if (event.key === "Escape") {
        setSelectedIndex(null);
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
  }, [selectedIndex, images.length]);

  if (loading || error) {
    return (
      <main className="project-details-page">
        <div className="project-details-page__container">
          <Link to="/projetos" className="project-details-page__back">
            <i className="fa-solid fa-arrow-left" aria-hidden="true" />
            Voltar para projetos
          </Link>

          <section className="project-details-card project-details-message">
            <p role={error ? "alert" : "status"}>
              {error || "Carregando projeto..."}
            </p>
          </section>
        </div>
      </main>
    );
  }

  const demoUrl = safeExternalUrl(project.liveURL);
  const githubUrl = safeExternalUrl(project.githubURL);
  const updatedAt = formatUpdatedAt(project.updatedAt);
  const description = project.description || "";
  const paragraphs = description.split(/\n+/).filter((text) => text.trim());
  const isLongDescription = description.length > LONG_DESCRIPTION_LENGTH;
  const technologies = project.technologies || [];
  const collaborators = project.collaborators || [];

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
              {project.status && (
                <span className="project-details-status">
                  <span aria-hidden="true" />

                  {project.status}
                </span>
              )}

              {project.major && <span>{project.major}</span>}
              {project.semester > 0 && <span>{project.semester}ª Fase</span>}
            </div>

            <h1>{project.title}</h1>

            {project.author?.name && <p>Por {project.author.name}</p>}

            {updatedAt && <small>{updatedAt}</small>}
          </div>

          {(demoUrl || githubUrl) && (
            <div className="project-details-hero__actions">
              {demoUrl && (
                <a
                  href={demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="project-details-primary-button"
                >
                  <i
                    className="fa-solid fa-arrow-up-right-from-square"
                    aria-hidden="true"
                  />

                  Ver demonstração
                </a>
              )}

              {githubUrl && (
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="project-details-secondary-button"
                >
                  <i
                    className="fa-brands fa-github"
                    aria-hidden="true"
                  />

                  Repositório
                </a>
              )}
            </div>
          )}
        </header>

        <div className="project-details-layout">
          <div className="project-details-main">
            <section className="project-details-card">
              <div className="project-details-card__header">
                <h2>Sobre o projeto</h2>
              </div>

              <div
                className={`project-details-description${
                  expanded || !isLongDescription ? " is-expanded" : ""
                }`}
              >
                {paragraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>

              {isLongDescription && (
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
              )}
            </section>

            {media.length > 0 && (
              <section className="project-details-card">
                <div className="project-details-card__header">
                  <div>
                    <h2>Galeria do projeto</h2>

                    {images.length > 0 && (
                      <p>
                        Clique em uma imagem para ampliar
                      </p>
                    )}
                  </div>
                </div>

                <div className="project-gallery">
                  {media.map((item, index) => (
                    <GalleryItem
                      key={item.id}
                      item={item}
                      featured={index === 0}
                      title={project.title}
                      onOpen={() => setSelectedIndex(images.indexOf(item))}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="project-details-sidebar">
            {technologies.length > 0 && (
              <section className="project-details-card project-details-sidebar__section">
                <h2>Tecnologias</h2>

                <div className="project-details-tags">
                  {technologies.map((technology) => (
                    <span key={technology}>
                      {technology}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {collaborators.length > 0 && (
              <section className="project-details-card project-details-sidebar__section">
                <h2>Colaboradores</h2>

                <div className="project-collaborators">
                  {collaborators.map((person) => {
                    const name = person.name || "Colaborador";

                    return (
                      <div
                        className="project-collaborator"
                        key={person.userId}
                      >
                        <span aria-hidden="true">
                          {getInitials(name)}
                        </span>

                        <div>
                          <strong>{name}</strong>
                          {person.contribution && <small>{person.contribution}</small>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>

      {selectedImage && (
        <div
          className="project-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`Imagem ${selectedIndex + 1} de ${images.length}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedIndex(null);
            }
          }}
        >
          <button
            type="button"
            className="project-lightbox__close"
            onClick={() => setSelectedIndex(null)}
            aria-label="Fechar galeria"
            title="Fechar"
          >
            ×
          </button>

          {images.length > 1 && (
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
          )}

          <div className="project-lightbox__image">
            <img
              src={selectedImage.url}
              alt={`Imagem ${selectedIndex + 1} do projeto ${project.title}`}
            />
          </div>

          {images.length > 1 && (
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
          )}
        </div>
      )}
    </main>
  );
}

// Imagens abrem no visualizador; vídeos tocam direto na galeria.
function GalleryItem({ item, featured, title, onOpen }) {
  const className = `project-gallery__item${featured ? " is-featured" : ""}`;

  if (item.mediaType === "image") {
    return (
      <button
        type="button"
        className={className}
        onClick={onOpen}
        aria-label={`Ampliar imagem do projeto ${title}`}
      >
        <img src={item.url} alt="" loading="lazy" />

        <span
          className="project-gallery__zoom"
          aria-hidden="true"
        >
          <i className="fa-solid fa-magnifying-glass-plus" />
        </span>
      </button>
    );
  }

  const youtubeId = getYoutubeVideoId(item.url);

  return (
    <div className={`${className} is-video`}>
      {youtubeId ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
          title={`Vídeo do projeto ${title}`}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <video src={item.url} controls preload="metadata" />
      )}
    </div>
  );
}
