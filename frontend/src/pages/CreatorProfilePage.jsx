import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import "./CreatorProfilePage.css";

const PROFILE_PHOTO =
  "https://images.unsplash.com/photo-1565120130276-dfbd9a7a3ad7?crop=faces&fit=crop&fm=jpg&q=85&w=640&h=640";

const FILTER_TABS = [
  { id: "todos", label: "Todos" },
  { id: "autor", label: "Como autor" },
  { id: "colaborador", label: "Como colaborador" },
];

const PROJECTS = [
  {
    id: 1,
    image:
      "https://images.unsplash.com/photo-1540397106260-e24a507a08ea?fit=crop&fm=jpg&q=80&w=800&h=480",
    title: "Projeto Node",
    description:
      "API REST construída com Node.js e Express para gerenciamento de tarefas colaborativas.",
    tags: ["Node.js", "Back-end", "API"],
    role: "autor",
  },
  {
    id: 2,
    image:
      "https://images.unsplash.com/photo-1675869940341-d495d49010b5?fit=crop&fm=jpg&q=80&w=800&h=480",
    title: "Plataforma de agendamentos",
    description:
      "Plataforma web de agendamento com interface responsiva e integração de pagamentos.",
    tags: ["React", "Front-end", "Web"],
    role: "autor",
  },
  {
    id: 3,
    image:
      "https://images.unsplash.com/photo-1582138825658-fb952c08b282?fit=crop&fm=jpg&q=80&w=800&h=480",
    title: "Transporter",
    description:
      "Sistema de rastreamento de entregas em tempo real com painel administrativo.",
    tags: ["React", "PostgreSQL", "Maps"],
    role: "colaborador",
  },
  {
    id: 4,
    image:
      "https://images.unsplash.com/photo-1630332458839-5ece43363621?fit=crop&fm=jpg&q=80&w=800&h=480",
    title: "TecHub",
    description:
      "Hub de projetos acadêmicos conectando estudantes, professores e recrutadores.",
    tags: ["React", "Node.js", "Web"],
    role: "colaborador",
  },
];

const PROFILE = {
  id: 1,
  name: "Antoni Ferraz",
  initials: "AF",
  profileSlug: "/p/antoni-ferraz",
  campus: "IFSC Câmpus Lages",
  course: "Ciência da Computação",
  phase: "8ª Fase",
  conclusion: "2026/2",
  status: "Em formação",
  bio: [
    "Olá! Sou Antoni Ferraz, estudante de Ciência da Computação no IFSC Câmpus Lages, atualmente na 8ª fase do curso. Apaixonado por tecnologia desde cedo, encontrei no desenvolvimento web minha principal área de interesse e atuação.",
    "Tenho experiência prática com React, Node.js e PostgreSQL, desenvolvendo aplicações web completas — do planejamento ao deploy. Também tenho interesse por testes de software, automação e qualidade em projetos colaborativos.",
  ],
  interests: [
    "React",
    "Node.js",
    "Python",
    "PostgreSQL",
    "CSS",
    "HTML",
    "Git",
    "Figma",
    "Agile",
  ],
  links: [
    {
      id: "github",
      label: "GitHub",
      url: "https://github.com",
      icon: "fa-brands fa-github",
    },
    {
      id: "linkedin",
      label: "LinkedIn",
      url: "https://linkedin.com",
      icon: "fa-brands fa-linkedin",
    },
    {
      id: "portfolio",
      label: "Portfólio/Currículo",
      url: "https://github.com/techub-ifsc/TecHub",
      icon: "fa-solid fa-link",
    },
  ],
};

export default function CreatorProfilePage() {
  const { id } = useParams();

  const [activeTab, setActiveTab] = useState("autor");
  const [copyFeedback, setCopyFeedback] = useState("");

  const filteredProjects = PROJECTS.filter((project) => {
    if (activeTab === "todos") {
      return true;
    }

    return project.role === activeTab;
  });

  async function handleCopyProfile() {
    const profileAddress = `${window.location.origin}/criadores/${id}`;

    try {
      await navigator.clipboard.writeText(profileAddress);
      setCopyFeedback("Link copiado!");

      window.setTimeout(() => {
        setCopyFeedback("");
      }, 2000);
    } catch {
      setCopyFeedback("Não foi possível copiar.");

      window.setTimeout(() => {
        setCopyFeedback("");
      }, 2000);
    }
  }

  return (
    <main className="creator-profile-page">
      <div className="creator-profile-page__container">
        <Link to="/criadores" className="creator-profile-page__back">
          <i className="fa-solid fa-arrow-left" aria-hidden="true" />
          Voltar para criadores
        </Link>

        <div className="creator-profile-layout">
          <div className="creator-profile-main">
            <section className="creator-profile-hero">
              <div className="creator-profile-hero__cover" />

              <div className="creator-profile-hero__information">
                <div className="creator-profile-avatar">
                  <img src={PROFILE_PHOTO} alt={PROFILE.name} />

                  <span
                    className="creator-profile-avatar__fallback"
                    aria-hidden="true"
                  >
                    {PROFILE.initials}
                  </span>
                </div>

                <h1>{PROFILE.name}</h1>

                <p className="creator-profile-hero__course">{PROFILE.course}</p>

                <p className="creator-profile-hero__phase">{PROFILE.phase}</p>

                <button
                  type="button"
                  className="creator-profile-address"
                  onClick={handleCopyProfile}
                  aria-label="Copiar endereço do perfil"
                >
                  <span>{PROFILE.profileSlug}</span>

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
                {PROFILE.bio.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>

              <span className="creator-profile-bio__counter">
                {PROFILE.bio.join(" ").length}/500
              </span>
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

              <div className="creator-profile-project-grid">
                {filteredProjects.map((project) => (
                  <Link
                    key={project.id}
                    to={`/projetos/${project.id}`}
                    className="creator-profile-project"
                    aria-label={`Abrir projeto ${project.title}`}
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
                        {project.role === "autor" ? "Autor" : "Colaborador"}
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
                ))}
              </div>
            </section>
          </div>

          <aside className="creator-profile-sidebar">
            <section className="creator-profile-card">
              <h2>Áreas de interesse</h2>

              <div className="creator-profile-interests">
                {PROFILE.interests.map((interest) => (
                  <span key={interest}>{interest}</span>
                ))}
              </div>
            </section>

            <section className="creator-profile-card">
              <h2>Links e contato</h2>

              <div className="creator-profile-links">
                {PROFILE.links.map((link) => (
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
                  <dd>{PROFILE.campus}</dd>
                </div>

                <div className="creator-profile-academic__field">
                  <dt>Curso</dt>
                  <dd>{PROFILE.course}</dd>
                </div>

                <div className="creator-profile-academic__field">
                  <dt>Previsão de término</dt>
                  <dd>{PROFILE.conclusion}</dd>
                </div>

                <div className="creator-profile-academic__field">
                  <dt>Status</dt>

                  <dd>
                    <span className="creator-profile-status">
                      <span aria-hidden="true" />
                      {PROFILE.status}
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
