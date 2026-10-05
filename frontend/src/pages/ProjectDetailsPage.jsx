import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getYoutubeVideoId } from "../utils/youtube";
import "./ProjectDetailsPage.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export default function ProjectDetailsPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setProject(null);
    setError("");
    setSelectedImage(null);
    fetch(`${API_URL}/projects/${id}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Não foi possível carregar o projeto.");
        setProject(data.project);
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") setError(requestError.message);
      });
    return () => controller.abort();
  }, [id]);

  const images = (project?.media || []).filter((item) => item.mediaType === "image");

  useEffect(() => {
    if (!selectedImage) return undefined;
    function handleKeyDown(event) {
      if (event.key === "Escape") setSelectedImage(null);
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        const current = images.findIndex((item) => item.id === selectedImage.id);
        const direction = event.key === "ArrowRight" ? 1 : -1;
        setSelectedImage(images[(current + direction + images.length) % images.length]);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [images, selectedImage]);

  function moveGallery(direction) {
    const current = images.findIndex((item) => item.id === selectedImage?.id);
    setSelectedImage(images[(current + direction + images.length) % images.length]);
  }

  if (error || !project) {
    return (
      <main className="project-details-page">
        <div className="project-details-page__container">
          <Link to="/projetos" className="project-details-page__back">Voltar para projetos</Link>
          <p role={error ? "alert" : "status"}>{error || "Carregando projeto..."}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="project-details-page">
      <div className="project-details-page__container">
        <Link to="/projetos" className="project-details-page__back">
          <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Voltar para projetos
        </Link>

        <header className="project-details-hero">
          <div className="project-details-hero__content">
            <div className="project-details-hero__meta">
              <span className="project-details-status">{project.status || "Projeto"}</span>
              {project.major && <span>{project.major}</span>}
              {project.semester > 0 && <span>{project.semester}ª Fase</span>}
            </div>
            <h1>{project.title}</h1>
            <p>{project.description}</p>
            <small>Atualizado em {new Date(project.updatedAt).toLocaleDateString("pt-BR")}</small>
          </div>
          <div className="project-details-hero__actions">
            {project.liveURL && (
              <a href={project.liveURL} target="_blank" rel="noopener noreferrer" className="project-details-primary-button">
                Ver demonstração
              </a>
            )}
            {project.githubURL && (
              <a href={project.githubURL} target="_blank" rel="noopener noreferrer" className="project-details-secondary-button">
                Repositório
              </a>
            )}
          </div>
        </header>

        <div className="project-details-layout">
          <div className="project-details-main">
            <section className="project-details-card">
              <div className="project-details-card__header"><h2>Sobre o projeto</h2></div>
              <div className={`project-details-description${expanded ? " is-expanded" : ""}`}>
                <p>{project.description}</p>
              </div>
              <button type="button" className="project-details-expand" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
                {expanded ? "Ver menos" : "Ver descrição completa"}
              </button>
            </section>

            <section className="project-details-card">
              <div className="project-details-card__header"><h2>Galeria do projeto</h2></div>
              <div className="project-gallery">
                {(project.media || []).map((item, index) => {
                  const youtubeId = getYoutubeVideoId(item.url);
                  if (youtubeId) {
                    return <iframe key={item.id} className="project-gallery__item is-real" src={`https://www.youtube-nocookie.com/embed/${youtubeId}`} title={`Vídeo ${index + 1} do projeto`} allowFullScreen />;
                  }
                  if (item.mediaType === "video") {
                    return <video key={item.id} className="project-gallery__item is-real" src={item.url} controls preload="metadata" aria-label={`Vídeo ${index + 1} do projeto`} />;
                  }
                  return (
                    <button key={item.id} type="button" className={`project-gallery__item is-real${item.isCover ? " is-featured" : ""}`} onClick={() => setSelectedImage(item)} aria-label={`Ampliar imagem ${index + 1}`}>
                      <img src={item.url} alt={`Imagem ${index + 1} do projeto`} loading="lazy" />
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          <aside className="project-details-sidebar">
            <section className="project-details-card project-details-sidebar__section">
              <h2>Tecnologias</h2>
              <div className="project-details-tags">{(project.technologies || []).map((name) => <span key={name}>{name}</span>)}</div>
            </section>
            <section className="project-details-card project-details-sidebar__section">
              <h2>Colaboradores</h2>
              <div className="project-collaborators">
                {(project.collaborators || []).map((person) => (
                  <div className="project-collaborator" key={person.userId}>
                    <span style={{ "--avatar-color": "#4f46e5" }} aria-hidden="true">{(person.name || "C").slice(0, 2).toUpperCase()}</span>
                    <div><strong>{person.name || "Colaborador"}</strong><small>{person.contribution || "Colaborador"}</small></div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>

      {selectedImage && (
        <div className="project-lightbox" role="dialog" aria-modal="true" aria-label="Visualização da imagem" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedImage(null); }}>
          <button type="button" className="project-lightbox__close" onClick={() => setSelectedImage(null)} aria-label="Fechar galeria">×</button>
          {images.length > 1 && <button type="button" className="project-lightbox__arrow is-left" onClick={() => moveGallery(-1)} aria-label="Imagem anterior">‹</button>}
          <img className="project-lightbox__image is-real" src={selectedImage.url} alt="Imagem ampliada do projeto" />
          {images.length > 1 && <button type="button" className="project-lightbox__arrow is-right" onClick={() => moveGallery(1)} aria-label="Próxima imagem">›</button>}
        </div>
      )}
    </main>
  );
}
