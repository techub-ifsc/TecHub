import { useMemo, useState } from "react";

import ConfirmationModal from "../components/ConfirmationModal";

import "./ProjectValidationPage.css";

const INITIAL_PROJECTS = [
  {
    id: 1,
    title: "Sistema de Monitoramento Ambiental",
    creator: "Ana Carolina",
    course: "Engenharia de Software",
    phase: "5ª fase",
    submittedAt: "Hoje, 10:35",
    description:
      "Plataforma para acompanhar sensores ambientais e apresentar informações sobre temperatura, umidade e qualidade do ar.",
    technologies: ["React", "Node.js", "PostgreSQL"],
    githubUrl: "https://github.com/",
    status: "pending",
  },
  {
    id: 2,
    title: "Biblioteca Digital IFSC",
    creator: "Lucas Martins",
    course: "Sistemas de Informação",
    phase: "4ª fase",
    submittedAt: "Ontem, 16:20",
    description:
      "Aplicação para organizar, pesquisar e disponibilizar materiais acadêmicos produzidos por estudantes.",
    technologies: ["React", "Express", "Sequelize"],
    githubUrl: "https://github.com/",
    status: "pending",
  },
  {
    id: 3,
    title: "Controle Inteligente de Laboratórios",
    creator: "Mariana Souza",
    course: "Ciência da Computação",
    phase: "6ª fase",
    submittedAt: "3 de outubro",
    description:
      "Sistema para reserva de laboratórios, controle de equipamentos e acompanhamento das atividades acadêmicas.",
    technologies: ["JavaScript", "Vite", "PostgreSQL"],
    githubUrl: "https://github.com/",
    status: "approved",
  },
];

const STATUS_LABELS = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
};

export default function ProjectValidationPage() {
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  const [selectedId, setSelectedId] = useState(INITIAL_PROJECTS[0].id);
  const [filter, setFilter] = useState("pending");
  const [decision, setDecision] = useState(null);

  const filteredProjects = useMemo(() => {
    if (filter === "all") {
      return projects;
    }

    return projects.filter((project) => project.status === filter);
  }, [filter, projects]);

  const selectedProject =
    projects.find((project) => project.id === selectedId) ||
    filteredProjects[0] ||
    null;

  const totals = useMemo(
    () => ({
      pending: projects.filter((project) => project.status === "pending")
        .length,
      approved: projects.filter((project) => project.status === "approved")
        .length,
      rejected: projects.filter((project) => project.status === "rejected")
        .length,
    }),
    [projects],
  );

  function selectFilter(nextFilter) {
    setFilter(nextFilter);

    const firstProject =
      nextFilter === "all"
        ? projects[0]
        : projects.find((project) => project.status === nextFilter);

    setSelectedId(firstProject?.id ?? null);
  }

  function updateProjectStatus(status) {
    if (!selectedProject) {
      return;
    }

    setProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.id === selectedProject.id
          ? { ...project, status }
          : project,
      ),
    );
  }

  return (
    <section className="validation-page">
      <div className="validation-page__container">
        <header className="validation-page__heading">
          <div>
            <span className="validation-page__eyebrow">
              Painel administrativo
            </span>

            <h1>Validação de projetos</h1>

            <p>
              Analise as informações enviadas pelos criadores antes de
              disponibilizar os projetos na plataforma.
            </p>
          </div>

          <div className="validation-page__pending-summary">
            <strong>{totals.pending}</strong>
            <span>aguardando análise</span>
          </div>
        </header>

        <div className="validation-page__stats">
          <article>
            <span className="validation-page__stat-icon is-pending">
              <i className="fa-regular fa-clock" aria-hidden="true" />
            </span>
            <div>
              <strong>{totals.pending}</strong>
              <span>Pendentes</span>
            </div>
          </article>

          <article>
            <span className="validation-page__stat-icon is-approved">
              <i className="fa-solid fa-check" aria-hidden="true" />
            </span>
            <div>
              <strong>{totals.approved}</strong>
              <span>Aprovados</span>
            </div>
          </article>

          <article>
            <span className="validation-page__stat-icon is-rejected">
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </span>
            <div>
              <strong>{totals.rejected}</strong>
              <span>Rejeitados</span>
            </div>
          </article>
        </div>

        <div className="validation-page__filters" aria-label="Filtrar projetos">
          {[
            ["pending", "Pendentes"],
            ["approved", "Aprovados"],
            ["rejected", "Rejeitados"],
            ["all", "Todos"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={filter === value ? "is-active" : ""}
              onClick={() => selectFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="validation-page__workspace">
          <aside className="validation-list">
            <div className="validation-list__header">
              <strong>Projetos</strong>
              <span>{filteredProjects.length}</span>
            </div>

            <div className="validation-list__items">
              {filteredProjects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  className={`validation-list__item${
                    selectedProject?.id === project.id ? " is-selected" : ""
                  }`}
                  onClick={() => setSelectedId(project.id)}
                >
                  <span className="validation-list__project-icon">
                    <i className="fa-regular fa-folder-open" aria-hidden="true" />
                  </span>

                  <span className="validation-list__content">
                    <strong>{project.title}</strong>
                    <small>{project.creator}</small>
                    <time>{project.submittedAt}</time>
                  </span>

                  <span
                    className={`validation-status is-${project.status}`}
                  >
                    {STATUS_LABELS[project.status]}
                  </span>
                </button>
              ))}

              {filteredProjects.length === 0 && (
                <div className="validation-list__empty">
                  <i className="fa-regular fa-circle-check" aria-hidden="true" />
                  <strong>Nenhum projeto encontrado</strong>
                  <span>Não existem projetos com esse status.</span>
                </div>
              )}
            </div>
          </aside>

          <article className="validation-details">
            {selectedProject ? (
              <>
                <div className="validation-details__header">
                  <div>
                    <span
                      className={`validation-status is-${selectedProject.status}`}
                    >
                      {STATUS_LABELS[selectedProject.status]}
                    </span>
                    <h2>{selectedProject.title}</h2>
                    <p>Enviado por {selectedProject.creator}</p>
                  </div>

                  <a
                    href={selectedProject.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="validation-details__github"
                  >
                    <i className="fa-brands fa-github" aria-hidden="true" />
                    GitHub
                  </a>
                </div>

                <div className="validation-details__section">
                  <h3>Descrição do projeto</h3>
                  <p>{selectedProject.description}</p>
                </div>

                <div className="validation-details__metadata">
                  <div>
                    <span>Curso</span>
                    <strong>{selectedProject.course}</strong>
                  </div>

                  <div>
                    <span>Fase</span>
                    <strong>{selectedProject.phase}</strong>
                  </div>

                  <div>
                    <span>Envio</span>
                    <strong>{selectedProject.submittedAt}</strong>
                  </div>
                </div>

                <div className="validation-details__section">
                  <h3>Tecnologias</h3>

                  <div className="validation-details__technologies">
                    {selectedProject.technologies.map((technology) => (
                      <span key={technology}>{technology}</span>
                    ))}
                  </div>
                </div>

                <div className="validation-details__actions">
                  <button
                    type="button"
                    className="validation-details__reject"
                    onClick={() => setDecision("rejected")}
                  >
                    <i className="fa-solid fa-xmark" aria-hidden="true" />
                    Rejeitar projeto
                  </button>

                  <button
                    type="button"
                    className="validation-details__approve"
                    onClick={() => setDecision("approved")}
                  >
                    <i className="fa-solid fa-check" aria-hidden="true" />
                    Aprovar projeto
                  </button>
                </div>
              </>
            ) : (
              <div className="validation-details__empty">
                <i className="fa-regular fa-folder-open" aria-hidden="true" />
                <strong>Selecione um projeto</strong>
                <span>Escolha um projeto da lista para iniciar a análise.</span>
              </div>
            )}
          </article>
        </div>
      </div>

      <ConfirmationModal
        open={decision !== null}
        tone={decision === "rejected" ? "danger" : "primary"}
        title={
          decision === "rejected"
            ? "Rejeitar este projeto?"
            : "Aprovar este projeto?"
        }
        description={
          decision === "rejected"
            ? `O projeto "${selectedProject?.title}" será marcado como rejeitado.`
            : `O projeto "${selectedProject?.title}" será aprovado para publicação.`
        }
        confirmLabel={
          decision === "rejected" ? "Sim, rejeitar" : "Sim, aprovar"
        }
        onCancel={() => setDecision(null)}
        onConfirm={() => {
          updateProjectStatus(decision);
          setDecision(null);
        }}
      />
    </section>
  );
}




