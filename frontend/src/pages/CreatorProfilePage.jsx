import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { API_URL } from "../api/apiUrl";
import "./CreatorProfilePage.css";

const PROFILE_PHOTO =
  "https://images.unsplash.com/photo-1565120130276-dfbd9a7a3ad7?crop=faces&fit=crop&fm=jpg&q=85&w=640&h=640";

const FILTER_TABS = [
  { id: "todos", label: "Todos" },
  { id: "autor", label: "Como autor" },
  { id: "colaborador", label: "Como colaborador" },
];

const DEFAULT_PROFILE = {
  name: "Estudante IFSC",
  initials: "IF",
  campus: "IFSC Câmpus Lages",
  course: "Ciência da Computação",
  phase: "Fase acadêmica",
  conclusion: "2026/2",
  status: "Em formação",
  bio: [
    "Estudante e entusiasta de tecnologia desenvolvendo soluções e projetos acadêmicos no IFSC Câmpus Lages.",
  ],
  interests: ["React", "Node.js", "PostgreSQL", "Git"],
  links: [
    {
      id: "github",
      label: "GitHub",
      url: "https://github.com",
      icon: "fa-brands fa-github",
    },
  ],
};

export default function CreatorProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("todos");
  const [copyFeedback, setCopyFeedback] = useState("");
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [deletingProjectId, setDeletingProjectId] = useState(null);

  // Recupera o usuário autenticado do localStorage
  const loggedUser = useMemo(() => {
    try {
      const raw = localStorage.getItem("techub_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const isOwner = loggedUser?.id === id;

  // Monta as informações visuais mesclando o que temos do usuário logado
  const profileInfo = useMemo(() => {
    if (isOwner && loggedUser) {
      const names = (loggedUser.name || "Usuário").trim().split(" ");
      const initials =
        names.length > 1
          ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
          : names[0].slice(0, 2).toUpperCase();

      return {
        ...DEFAULT_PROFILE,
        name: loggedUser.name,
        initials,
        email: loggedUser.email,
        profileSlug: `/criadores/${loggedUser.id.slice(0, 8)}`,
      };
    }

    return {
      ...DEFAULT_PROFILE,
      profileSlug: `/criadores/${id?.slice(0, 8) || ""}`,
    };
  }, [id, isOwner, loggedUser]);

  // Carrega e filtra os projetos reais do banco
  useEffect(() => {
    async function loadUserProjects() {
      try {
        setLoadingProjects(true);
        const response = await fetch(`${API_URL}/projects?limit=100`);

        if (!response.ok) {
          throw new Error("Erro ao buscar projetos");
        }

        const data = await response.json();
        const allProjects = Array.isArray(data.projects)
          ? data.projects
          : Array.isArray(data)
            ? data
            : [];

        // Filtra projetos onde o usuário atual é autor ou colaborador
        const userProjects = [];

        allProjects.forEach((p) => {
          const isAuthor =
            p.ownerId === id ||
            p.owner_id === id ||
            p.author?.id === id;

          const isCollaborator = Array.isArray(p.collaborators)
            ? p.collaborators.some(
              (c) => c.userId === id || c.user_id === id || c.id === id
            )
            : false;

          if (isAuthor) {
            userProjects.push({
              id: p.id,
              title: p.title,
              description: p.description,
              tags: Array.isArray(p.technologies) ? p.technologies : [],
              role: "autor",
              image:
                p.coverUrl ||
                "https://images.unsplash.com/photo-1540397106260-e24a507a08ea?fit=crop&fm=jpg&q=80&w=800&h=480",
            });
          } else if (isCollaborator) {
            userProjects.push({
              id: p.id,
              title: p.title,
              description: p.description,
              tags: Array.isArray(p.technologies) ? p.technologies : [],
              role: "colaborador",
              image:
                p.coverUrl ||
                "https://images.unsplash.com/photo-1630332458839-5ece43363621?fit=crop&fm=jpg&q=80&w=800&h=480",
            });
          }
        });

        setProjects(userProjects);
      } catch (err) {
        console.error("Falha ao carregar projetos do criador:", err);
      } finally {
        setLoadingProjects(false);
      }
    }

    if (id) {
      loadUserProjects();
    }
  }, [id]);

  const filteredProjects = projects.filter((project) => {
    if (activeTab === "todos") return true;
    return project.role === activeTab;
  });

  async function handleDeleteProject(event, projectId) {
    event.preventDefault();
    event.stopPropagation();

    if (!window.confirm("Excluir este projeto definitivamente? Esta ação não pode ser desfeita nesta versão.")) {
      return;
    }

    try {
      setDeletingProjectId(projectId);
      const token =
        localStorage.getItem("techub_token") || localStorage.getItem("token");
      const res = await fetch(`${API_URL}/projects/${projectId}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erro ao excluir projeto.");
      }

      setProjects((current) => current.filter((p) => p.id !== projectId));
      alert("Projeto excluído com sucesso!");
    } catch (err) {
      console.error(err);
      alert(err.message || "Não foi possível excluir o projeto.");
    } finally {
      setDeletingProjectId(null);
    }
  }

  async function handleCopyProfile() {
    const profileAddress = `${window.location.origin}/criadores/${id}`;

    try {
      await navigator.clipboard.writeText(profileAddress);
      setCopyFeedback("Link copiado!");
      window.setTimeout(() => setCopyFeedback(""), 2000);
    } catch {
      setCopyFeedback("Não foi possível copiar.");
      window.setTimeout(() => setCopyFeedback(""), 2000);
    }
  }

  return (
    <main className="creator-profile-page">
      <div className="creator-profile-page__container">
        <Link to="/projetos" className="creator-profile-page__back">
          <i className="fa-solid fa-arrow-left" aria-hidden="true" />
          Voltar para projetos
        </Link>

        <div className="creator-profile-layout">
          <div className="creator-profile-main">
            <section className="creator-profile-hero">
              <div className="creator-profile-hero__cover" />

              {isOwner && (
                <Link
                  to={`/criadores/${id}/editar`}
                  className="creator-profile-hero__edit"
                >
                  <i className="fa-solid fa-pen" aria-hidden="true" />
                  Editar perfil
                </Link>
              )}

              <div className="creator-profile-hero__information">
                <div className="creator-profile-avatar">
                  <img src={PROFILE_PHOTO} alt={profileInfo.name} />

                  <span
                    className="creator-profile-avatar__fallback"
                    aria-hidden="true"
                  >
                    {profileInfo.initials}
                  </span>
                </div>

                <h1>{profileInfo.name}</h1>

                <p className="creator-profile-hero__course">
                  {profileInfo.course}
                </p>

                <p className="creator-profile-hero__phase">
                  {profileInfo.phase}
                </p>

                <button
                  type="button"
                  className="creator-profile-address"
                  onClick={handleCopyProfile}
                  aria-label="Copiar endereço do perfil"
                >
                  <span>{profileInfo.profileSlug}</span>
                  <i className="fa-regular fa-copy" aria-hidden="true" />
                </button>

                <span
                  className="creator-profile-copy-feedback"
                  role="status"
                  aria-live="polite"
                >
                  {copyFeedback}
                </span>
              </div>
            </section>

            <section className="creator-profile-card creator-profile-bio">
              <h2>Bio / Apresentação</h2>

              <div className="creator-profile-bio__content">
                {profileInfo.bio.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </section>

            <section className="creator-profile-card creator-profile-projects">
              <div className="creator-profile-section-heading">
                <div>
                  <h2>Projetos</h2>
                  <p>
                    Projetos publicados como autor ou desenvolvidos em
                    colaboração.
                  </p>
                </div>

                <span>
                  {filteredProjects.length}{" "}
                  {filteredProjects.length === 1 ? "projeto" : "projetos"}
                </span>
              </div>

              <div
                className="creator-profile-tabs"
                role="tablist"
                aria-label="Filtrar projetos pela participação"
              >
                {FILTER_TABS.map((tab) => {
                  const isActive = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      className={isActive ? "is-active" : ""}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {loadingProjects ? (
                <p style={{ padding: "2rem", textAlign: "center" }}>
                  Carregando projetos do estudante...
                </p>
              ) : filteredProjects.length === 0 ? (
                <p
                  style={{
                    padding: "2rem",
                    textAlign: "center",
                    color: "var(--color-text-muted, #666)",
                  }}
                >
                  Nenhum projeto encontrado nesta categoria.
                </p>
              ) : (
                <div className="creator-profile-project-grid">
                  {filteredProjects.map((project) => (
                    <div
                      key={project.id}
                      className="creator-profile-project"
                      style={{ position: "relative" }}
                    >
                      <Link
                        to={`/projetos/${project.id}`}
                        style={{
                          textDecoration: "none",
                          color: "inherit",
                          display: "block",
                        }}
                      >
                        <div className="creator-profile-project__image">
                          <img
                            src={project.image}
                            alt=""
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />

                          <span className="creator-profile-project__role">
                            {project.role === "autor"
                              ? "Autor"
                              : "Colaborador"}
                          </span>
                        </div>

                        <div className="creator-profile-project__content">
                          <h3>{project.title}</h3>
                          <p>{project.description}</p>

                          <div
                            className="creator-profile-project__tags"
                            aria-label="Tecnologias utilizadas"
                          >
                            {project.tags.map((tag) => (
                              <span key={tag}>{tag}</span>
                            ))}
                          </div>
                        </div>
                      </Link>

                      {/* Colaboradores editam conteúdo; somente o dono pode excluir. */}
                      {isOwner && (
                        <div
                          style={{
                            display: "flex",
                            gap: "0.5rem",
                            padding: "0.5rem 1rem 1rem",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => navigate(`/projetos/${project.id}/editar`)}
                            style={{
                              flex: "1 1 0",
                              width: 0,
                              boxSizing: "border-box",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "0.4rem",
                              padding: "0.45rem 0.5rem",
                              borderRadius: "6px",
                              background: "#f8fafc",
                              color: "#334155",
                              cursor: "pointer",
                              fontSize: "0.85rem",
                              fontWeight: 600,
                              transition: "all 0.15s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#e2e8f0";
                              e.currentTarget.style.borderColor = "#94a3b8";
                              e.currentTarget.style.color = "#0f172a";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "#f8fafc";
                              e.currentTarget.style.borderColor = "#cbd5e1";
                              e.currentTarget.style.color = "#334155";
                            }}
                          >
                            <i className="fa-solid fa-pen" aria-hidden="true" />
                            Editar
                          </button>

                          {project.role === "autor" && <button
                            type="button"
                            onClick={(e) => handleDeleteProject(e, project.id)}
                            disabled={deletingProjectId === project.id}
                            style={{
                              flex: "1 1 0",
                              width: 0,
                              boxSizing: "border-box",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "0.4rem",
                              padding: "0.45rem 0.5rem",
                              borderRadius: "6px",
                              border: "1px solid #dc3545",
                              background: "#dc3545",
                              color: "#fff",
                              cursor: "pointer",
                              fontSize: "0.85rem",
                              fontWeight: 600,
                              transition: "all 0.15s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#b02a37";
                              e.currentTarget.style.borderColor = "#b02a37";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "#dc3545";
                              e.currentTarget.style.borderColor = "#dc3545";
                            }}
                          >
                            <i className="fa-solid fa-trash" aria-hidden="true" />
                            Excluir
                          </button>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="creator-profile-sidebar">
            <section className="creator-profile-card">
              <h2>Áreas de interesse</h2>
              <div className="creator-profile-interests">
                {profileInfo.interests.map((interest) => (
                  <span key={interest}>{interest}</span>
                ))}
              </div>
            </section>

            <section className="creator-profile-card">
              <h2>Links e contato</h2>
              <div className="creator-profile-links">
                {profileInfo.links.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <i className={link.icon} aria-hidden="true" />
                    <span>{link.label}</span>
                    <i
                      className="fa-solid fa-arrow-up-right-from-square"
                      aria-hidden="true"
                    />
                  </a>
                ))}
              </div>
            </section>

            <section className="creator-profile-card">
              <h2>Situação acadêmica</h2>
              <dl className="creator-profile-academic">
                <div className="creator-profile-academic__field">
                  <dt>Campus</dt>
                  <dd>{profileInfo.campus}</dd>
                </div>

                <div className="creator-profile-academic__field">
                  <dt>Curso</dt>
                  <dd>{profileInfo.course}</dd>
                </div>

                <div className="creator-profile-academic__field">
                  <dt>Previsão de término</dt>
                  <dd>{profileInfo.conclusion}</dd>
                </div>

                <div className="creator-profile-academic__field">
                  <dt>Status</dt>
                  <dd>
                    <span className="creator-profile-status">
                      <span aria-hidden="true" />
                      {profileInfo.status}
                    </span>
                  </dd>
                </div>
              </dl>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
