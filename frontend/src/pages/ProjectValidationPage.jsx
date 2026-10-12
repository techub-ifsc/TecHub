import { useMemo, useState } from "react";

import ConfirmationModal from "../components/ConfirmationModal";

import "./ProjectValidationPage.css";

const INITIAL_PROJECTS = [
  {
    id: 1,
    title: "Sistema de Monitoramento Ambiental",
    creator: "Ana Carolina",
    course: "Ciência da Computação",
    phase: "5ª fase",
    submittedAt: "Hoje, 10:35",
    description:
      "Plataforma para acompanhar sensores ambientais e apresentar informações sobre temperatura, umidade e qualidade do ar.",
    technologies: ["React", "Node.js", "PostgreSQL"],
    collaborators: [
      { id: 1, name: "Antoni Ferraz" },
      { id: 2, name: "Gabriela Rodrigues" },
    ],
    github: "https://github.com/techub-ifsc/TecHub",
    liveUrl: "https://example.com/monitoramento-ambiental",
    developmentStatus: "Em desenvolvimento",
    media: [
      {
        id: 1,
        name: "dashboard-monitoramento.png",
        type: "image",
        size: "1,8 MB",
        preview: "https://picsum.photos/seed/techub-ambiental-1/800/450",
      },
      {
        id: 2,
        name: "sensores-em-funcionamento.jpg",
        type: "image",
        size: "2,4 MB",
        preview: "https://picsum.photos/seed/techub-ambiental-2/800/450",
      },
      {
        id: 3,
        name: "demonstracao-do-sistema.mp4",
        type: "video",
        size: "12,7 MB",
        preview: "https://picsum.photos/seed/techub-ambiental-3/800/450",
      },
    ],
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
    collaborators: [
      { id: 3, name: "Mariana Souza" },
      { id: 4, name: "João Costa" },
    ],
    github: "https://github.com/techub-ifsc/TecHub",
    liveUrl: "https://example.com/biblioteca-digital",
    developmentStatus: "Em design",
    media: [
      {
        id: 1,
        name: "pagina-inicial-biblioteca.png",
        type: "image",
        size: "1,5 MB",
        preview: "https://picsum.photos/seed/techub-biblioteca-1/800/450",
      },
      {
        id: 2,
        name: "pesquisa-de-materiais.png",
        type: "image",
        size: "2,1 MB",
        preview: "https://picsum.photos/seed/techub-biblioteca-2/800/450",
      },
      {
        id: 3,
        name: "apresentacao-biblioteca.mp4",
        type: "video",
        size: "10,3 MB",
        preview: "https://picsum.photos/seed/techub-biblioteca-3/800/450",
      },
    ],
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
    collaborators: [
      { id: 5, name: "Lucas Mendes" },
      { id: 6, name: "Gabriela Rodrigues" },
      { id: 7, name: "Antoni Ferraz" },
    ],
    github: "https://github.com/techub-ifsc/TecHub",
    liveUrl: "https://example.com/controle-laboratorios",
    developmentStatus: "Concluído",
    media: [
      {
        id: 1,
        name: "painel-dos-laboratorios.png",
        type: "image",
        size: "1,9 MB",
        preview: "https://picsum.photos/seed/techub-laboratorio-1/800/450",
      },
      {
        id: 2,
        name: "reserva-de-equipamentos.png",
        type: "image",
        size: "2,7 MB",
        preview: "https://picsum.photos/seed/techub-laboratorio-2/800/450",
      },
      {
        id: 3,
        name: "demonstracao-laboratorios.mp4",
        type: "video",
        size: "15,2 MB",
        preview: "https://picsum.photos/seed/techub-laboratorio-3/800/450",
      },
    ],
    status: "approved",
  },
  {
    id: 4,
    title: "Aplicativo de Transporte Acadêmico",
    creator: "Pedro Henrique",
    course: "Ciência da Computação",
    phase: "3ª fase",
    submittedAt: "2 de outubro",
    description:
      "Aplicativo para acompanhar horários e rotas do transporte acadêmico.",
    technologies: ["React Native", "Firebase"],
    status: "pending",
  },
  {
    id: 5,
    title: "Portal de Eventos Estudantis",
    creator: "Juliana Alves",
    course: "Sistemas de Informação",
    phase: "4ª fase",
    submittedAt: "1 de outubro",
    description:
      "Portal para divulgação e gerenciamento de eventos acadêmicos.",
    technologies: ["Vue.js", "Node.js"],
    status: "pending",
  },
  {
    id: 6,
    title: "Gerenciador de Estágios",
    creator: "Rafael Oliveira",
    course: "Ciência da Computação",
    phase: "6ª fase",
    submittedAt: "30 de setembro",
    description:
      "Sistema para acompanhar oportunidades e processos de estágio.",
    technologies: ["Angular", "Spring Boot"],
    status: "approved",
  },
  {
    id: 7,
    title: "Mapa de Acessibilidade do Campus",
    creator: "Camila Ferreira",
    course: "Sistemas de Informação",
    phase: "5ª fase",
    submittedAt: "29 de setembro",
    description:
      "Mapa colaborativo com informações de acessibilidade do campus.",
    technologies: ["React", "Google Maps"],
    status: "pending",
  },
  {
    id: 8,
    title: "Plataforma de Estudos Colaborativos",
    creator: "Bruno Martins",
    course: "Ciência da Computação",
    phase: "2ª fase",
    submittedAt: "28 de setembro",
    description:
      "Ambiente para criação e compartilhamento de grupos de estudos.",
    technologies: ["Next.js", "MongoDB"],
    status: "rejected",
  },
  {
    id: 9,
    title: "Controle de Empréstimos de Equipamentos",
    creator: "Fernanda Lima",
    course: "Sistemas de Informação",
    phase: "3ª fase",
    submittedAt: "27 de setembro",
    description:
      "Sistema para controlar empréstimos e devoluções de equipamentos.",
    technologies: ["PHP", "MySQL"],
    status: "pending",
  },
  {
    id: 10,
    title: "Assistente Virtual Acadêmico",
    creator: "Gustavo Souza",
    course: "Ciência da Computação",
    phase: "7ª fase",
    submittedAt: "26 de setembro",
    description:
      "Assistente virtual para responder dúvidas frequentes dos estudantes.",
    technologies: ["Python", "Inteligência Artificial"],
    status: "approved",
  },
  {
    id: 11,
    title: "Sistema de Gestão de Monitorias",
    creator: "Larissa Rocha",
    course: "Sistemas de Informação",
    phase: "4ª fase",
    submittedAt: "25 de setembro",
    description:
      "Sistema para organizar horários e atendimentos de monitoria.",
    technologies: ["React", "Express"],
    status: "pending",
  },
  {
    id: 12,
    title: "Painel de Indicadores Acadêmicos",
    creator: "Diego Ribeiro",
    course: "Ciência da Computação",
    phase: "8ª fase",
    submittedAt: "24 de setembro",
    description:
      "Painel para visualização de indicadores e informações acadêmicas.",
    technologies: ["TypeScript", "Data Science"],
    status: "rejected",
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

                {selectedProject.developmentStatus && (
                  <div className="validation-details__section validation-details__inline-section">
                    <h3>Status de desenvolvimento</h3>

                    <span className="validation-details__development-status">
                      <i
                        className="fa-solid fa-code-branch"
                        aria-hidden="true"
                      />
                      {selectedProject.developmentStatus}
                    </span>
                  </div>
                )}

                {selectedProject.collaborators?.length > 0 && (
                  <div className="validation-details__section">
                    <h3>Colaboradores</h3>

                    <div className="validation-details__collaborators">
                      {selectedProject.collaborators.map((collaborator) => (
                        <div
                          key={collaborator.id}
                          className="validation-details__collaborator"
                        >
                          <span aria-hidden="true">
                            {collaborator.name.charAt(0).toUpperCase()}
                          </span>

                          <strong>{collaborator.name}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(selectedProject.github || selectedProject.liveUrl) && (
                  <div className="validation-details__section">
                    <h3>Links do projeto</h3>

                    <div className="validation-details__links">
                      {selectedProject.github && (
                        <a
                          href={selectedProject.github}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <i
                            className="fa-brands fa-github"
                            aria-hidden="true"
                          />
                          <span>
                            <small>Repositório</small>
                            <strong>Visualizar no GitHub</strong>
                          </span>
                          <i
                            className="fa-solid fa-arrow-up-right-from-square"
                            aria-hidden="true"
                          />
                        </a>
                      )}

                      {selectedProject.liveUrl && (
                        <a
                          href={selectedProject.liveUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <i
                            className="fa-solid fa-globe"
                            aria-hidden="true"
                          />
                          <span>
                            <small>Demonstração</small>
                            <strong>Acessar projeto</strong>
                          </span>
                          <i
                            className="fa-solid fa-arrow-up-right-from-square"
                            aria-hidden="true"
                          />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {selectedProject.media?.length > 0 && (
                  <div className="validation-details__section">
                    <h3>Galeria do projeto</h3>

                    <div className="validation-details__gallery">
                      {selectedProject.media.map((file) => (
                        <article
                          key={file.id}
                          className="validation-details__media"
                        >
                          <div className="validation-details__media-preview">
                            {file.preview ? (
                              <img
                                src={file.preview}
                                alt={`Pré-visualização de ${file.name}`}
                                loading="lazy"
                              />
                            ) : (
                              <i
                                className="fa-regular fa-image"
                                aria-hidden="true"
                              />
                            )}

                            {file.type === "video" && (
                              <span className="validation-details__play">
                                <i
                                  className="fa-solid fa-play"
                                  aria-hidden="true"
                                />
                              </span>
                            )}
                          </div>

                          <div className="validation-details__media-info">
                            <strong>{file.name}</strong>
                            <span>
                              {file.type === "video" ? "Vídeo" : "Imagem"}
                              {" • "}
                              {file.size}
                            </span>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                )}

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




