import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { API_URL } from "../api/apiUrl";
import { safeExternalUrl } from "../utils/externalUrl";
import { getYoutubeVideoId } from "../utils/youtube";
import "./ProjectDetailsPage.css";

const LONG_DESCRIPTION_LENGTH = 400;

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

  // Recupera o usuário logado do localStorage para validar autoria/colaboração
  const loggedUser = useMemo(() => {
    try {
      const raw = localStorage.getItem("techub_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    async function loadProject() {
      try {
        setLoading(true);
        setError("");
        setSelectedIndex(null);

        // Com o token, o dono, os colaboradores e a moderação conseguem abrir
        // um projeto que ainda não foi aprovado.
        const token =
          localStorage.getItem("techub_token") || localStorage.getItem("token");

        const response = await fetch(`${API_URL}/projects/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

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
        setError(
          "Não foi possível carregar o projeto. Verifique se o servidor está ativo."
        );
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
    if (selectedImage === null) return undefined;

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
  }, [selectedIndex, images.length, selectedImage]);

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
  const isRejected = project.approvalStatus === "rejected";
  const isUnderReview = project.approvalStatus === "pending";
  const isApproved = project.approvalStatus === "approved";

  // Identifica se o usuário atual é dono, colaborador ou admin
  const isOwner =
    loggedUser &&
    (project.ownerId === loggedUser.id ||
      project.owner_id === loggedUser.id ||
      project.author?.id === loggedUser.id);

  const isCollaborator =
    loggedUser &&
    Array.isArray(collaborators) &&
    collaborators.some(
      (c) => c.userId === loggedUser.id || c.id === loggedUser.id
    );

  const isAdmin = loggedUser?.role === "super_admin";

  // Autor, colaboradores e administradores têm permissão para ler o parecer institucional
  const canViewReviewNotes = isOwner || isCollaborator || isAdmin;

  return (
    <main className="project-details-page">
      <div className="project-details-page__container">
        <Link to="/projetos" className="project-details-page__back">
          <i className="fa-solid fa-arrow-left" aria-hidden="true" />
          Voltar para projetos
        </Link>

        {/* Banner para projetos Pendentes ou Rejeitados */}
        {(isRejected || isUnderReview) && (
          <section
            className={`project-details-moderation${
              isRejected ? " is-rejected" : ""
            }`}
            role="status"
          >
            <i
              className={`fa-solid ${
                isRejected ? "fa-circle-xmark" : "fa-hourglass-half"
              }`}
              aria-hidden="true"
            />

            <div>
              <strong>
                {isRejected
                  ? "Projeto rejeitado pela moderação"
                  : "Projeto em análise"}
              </strong>

              {isRejected ? (
                <>
                  <p>{project.reviewNotes}</p>
                  <small>
                    Edite o projeto para corrigir e reenviar para análise.
                  </small>
                </>
              ) : (
                <p>
                  Ele ainda não está público. Somente o autor, os
                  colaboradores e a moderação conseguem ver esta página.
                </p>
              )}
            </div>
          </section>
        )}

        {/* Banner de Aprovação com Parecer da Moderação */}
        {isApproved && canViewReviewNotes && project.reviewNotes && (
          <section
            style={{
              marginBottom: "1.5rem",
              padding: "1.15rem 1.35rem",
              borderRadius: "8px",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderLeft: "4px solid #10b981",
            }}
            role="status"
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.55rem",
                color: "#f8fafc",
                fontWeight: 600,
                fontSize: "0.95rem",
                marginBottom: "0.3rem",
              }}
            >
              <i
                className="fa-solid fa-circle-check"
                style={{ color: "#10b981" }}
                aria-hidden="true"
              />
              <span>Projeto Aprovado pela Moderação</span>
            </div>

            {project.reviewedAt && (
              <span
                style={{
                  display: "block",
                  fontSize: "0.78rem",
                  color: "#94a3b8",
                  marginBottom: "0.65rem",
                }}
              >
                Avaliado em:{" "}
                {new Date(project.reviewedAt).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}

            <div
              style={{
                padding: "0.75rem 0.9rem",
                borderRadius: "6px",
                background: "rgba(0, 0, 0, 0.25)",
                border: "1px solid rgba(255, 255, 255, 0.05)",
                color: "#cbd5e1",
                fontSize: "0.9rem",
                lineHeight: "1.5",
                marginBottom: "0.65rem",
              }}
            >
              <strong
                style={{
                  color: "#e2e8f0",
                  display: "block",
                  marginBottom: "0.2rem",
                  fontSize: "0.85rem",
                }}
              >
                Parecer do avaliador:
              </strong>
              {project.reviewNotes}
            </div>

            {/* Aviso de visibilidade restrita aos participantes */}
            <p
              style={{
                margin: 0,
                fontSize: "0.8rem",
                color: "#94a3b8",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <i
                className="fa-solid fa-circle-exclamation"
                style={{ fontSize: "0.8rem", color: "#64748b" }}
                aria-hidden="true"
              />
              <span>
                Este parecer é visível apenas para os autores, colaboradores do projeto e moderadores.
              </span>
            </p>
          </section>
        )}

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
                        key={person.userId || person.id}
                      >
                        <span aria-hidden="true">
                          {getInitials(name)}
                        </span>

                        <div>
                          <strong>{name}</strong>
                          {person.contribution && (
                            <small>{person.contribution}</small>
                          )}
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