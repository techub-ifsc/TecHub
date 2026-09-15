import { useEffect, useMemo, useRef, useState } from "react";

import "./ProjectsPage.css";

const COURSES = {
  "Ciência da Computação": 8,
  "Técnico em Informática para Internet": 4,
  "Técnico em Desenvolvimento de Sistemas": 3,
};

const TECHNOLOGIES = [
  "AWS",
  "Back-end",
  "CSS",
  "Data Science",
  "Docker",
  "FastAPI",
  "Firebase",
  "Flutter",
  "Front-end",
  "Full Stack",
  "Git",
  "GitHub",
  "GraphQL",
  "HTML",
  "Java",
  "JavaScript",
  "Laravel",
  "Machine Learning",
  "Mobile",
  "MongoDB",
  "MySQL",
  "Next.js",
  "Node.js",
  "PHP",
  "PostgreSQL",
  "Python",
  "React",
  "React Native",
  "REST API",
  "Spring Boot",
  "Tailwind CSS",
  "TypeScript",
  "Vue.js",
  "Web",
];

const MOCK_PROJECTS = [
  {
    id: 1,
    title: "SiteWebBlue.com",
    author: "Matheus Oliveira",
    course: "Ciência da Computação",
    phase: "4ª Fase",
    tags: ["Web", "Front-end", "React"],
    color: "#c9e2f5",
  },
  {
    id: 2,
    title: "AppMobile.dev",
    author: "Maria Silva",
    course: "Ciência da Computação",
    phase: "5ª Fase",
    tags: ["Mobile", "React Native", "Firebase"],
    color: "#d7cdf5",
  },
  {
    id: 3,
    title: "Dashboard Analytics",
    author: "João Costa",
    course: "Ciência da Computação",
    phase: "6ª Fase",
    tags: ["Front-end", "React", "Data Science"],
    color: "#cce9dd",
  },
  {
    id: 4,
    title: "PortfólioTech.io",
    author: "Ana Ferreira",
    course: "Técnico em Informática para Internet",
    phase: "3ª Fase",
    tags: ["Web", "HTML", "CSS"],
    color: "#f4d5c4",
  },
  {
    id: 5,
    title: "EcoTrack API",
    author: "Lucas Andrade",
    course: "Ciência da Computação",
    phase: "7ª Fase",
    tags: ["Back-end", "Node.js", "PostgreSQL"],
    color: "#c8e7ca",
  },
  {
    id: 6,
    title: "Finanças Pessoais",
    author: "Beatriz Lima",
    course: "Técnico em Desenvolvimento de Sistemas",
    phase: "2ª Fase",
    tags: ["Front-end", "React", "TypeScript"],
    color: "#f2dfad",
  },
  {
    id: 7,
    title: "TaskFlow Manager",
    author: "Gabriel Santos",
    course: "Ciência da Computação",
    phase: "5ª Fase",
    tags: ["Full Stack", "Next.js", "Tailwind CSS"],
    color: "#c9d8f2",
  },
  {
    id: 8,
    title: "Guia Universitário",
    author: "Camila Rocha",
    course: "Técnico em Informática para Internet",
    phase: "3ª Fase",
    tags: ["Web", "HTML", "JavaScript"],
    color: "#e7c8d7",
  },
  {
    id: 9,
    title: "HealthPulse Mobile",
    author: "Felipe Martins",
    course: "Ciência da Computação",
    phase: "6ª Fase",
    tags: ["Mobile", "React Native", "Firebase"],
    color: "#c4e6e8",
  },
  {
    id: 10,
    title: "CodeShare Platform",
    author: "Larissa Dias",
    course: "Técnico em Desenvolvimento de Sistemas",
    phase: "3ª Fase",
    tags: ["Web", "Python", "FastAPI"],
    color: "#e9d4ba",
  },
  {
    id: 11,
    title: "Nexus ERP Acadêmico",
    author: "Rafael Souza",
    course: "Ciência da Computação",
    phase: "8ª Fase",
    tags: ["Back-end", "Java", "Spring Boot"],
    color: "#cfd2ef",
  },
  {
    id: 12,
    title: "PixelCraft Editor",
    author: "Juliana Mendes",
    course: "Técnico em Informática para Internet",
    phase: "4ª Fase",
    tags: ["Web", "Front-end", "TypeScript"],
    color: "#ebc9c9",
  },
  {
    id: 13,
    title: "AgroSense IoT",
    author: "Carolina Nogueira",
    course: "Ciência da Computação",
    phase: "7ª Fase",
    tags: ["Full Stack", "Vue.js", "Python"],
    color: "#d4e6bd",
  },
  {
    id: 14,
    title: "FastDelivery App",
    author: "Fernanda Costa",
    course: "Técnico em Desenvolvimento de Sistemas",
    phase: "2ª Fase",
    tags: ["Mobile", "Flutter", "REST API"],
    color: "#f1d4b8",
  },
  {
    id: 15,
    title: "BiblioTech IFSC",
    author: "Thiago Barbosa",
    course: "Técnico em Informática para Internet",
    phase: "4ª Fase",
    tags: ["Web", "PHP", "Laravel"],
    color: "#c6dfef",
  },
  {
    id: 16,
    title: "VisionAI Classifier",
    author: "Pedro Almeida",
    course: "Ciência da Computação",
    phase: "8ª Fase",
    tags: ["Machine Learning", "Python", "Data Science"],
    color: "#ddd0ef",
  },
];

const ITEMS_PER_PAGE = 8;

export default function ProjectsPage() {
  const [search, setSearch] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedPhase, setSelectedPhase] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagSearch, setTagSearch] = useState("");
  const [tagsOpen, setTagsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const tagsContainerRef = useRef(null);

  const phaseOptions = selectedCourse
    ? Array.from(
        { length: COURSES[selectedCourse] },
        (_, index) => `${index + 1}ª Fase`,
      )
    : [];

  const availableTags = useMemo(() => {
    const normalizedSearch = tagSearch.trim().toLowerCase();

    return TECHNOLOGIES.filter((tag) => {
      const matchesSearch = tag.toLowerCase().includes(normalizedSearch);
      const isNotSelected = !selectedTags.includes(tag);

      return matchesSearch && isNotSelected;
    });
  }, [tagSearch, selectedTags]);

  const filteredProjects = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return MOCK_PROJECTS.filter((project) => {
      const matchesSearch =
        !normalizedSearch ||
        project.title.toLowerCase().includes(normalizedSearch) ||
        project.author.toLowerCase().includes(normalizedSearch) ||
        project.tags.some((tag) =>
          tag.toLowerCase().includes(normalizedSearch),
        );

      const matchesCourse =
        !selectedCourse || project.course === selectedCourse;

      const matchesPhase =
        !selectedPhase || project.phase === selectedPhase;

      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.every((tag) => project.tags.includes(tag));

      return (
        matchesSearch &&
        matchesCourse &&
        matchesPhase &&
        matchesTags
      );
    });
  }, [search, selectedCourse, selectedPhase, selectedTags]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProjects.length / ITEMS_PER_PAGE),
  );

  const visibleProjects = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;

    return filteredProjects.slice(
      startIndex,
      startIndex + ITEMS_PER_PAGE,
    );
  }, [filteredProjects, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCourse, selectedPhase, selectedTags]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        tagsContainerRef.current &&
        !tagsContainerRef.current.contains(event.target)
      ) {
        setTagsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  function handleCourseChange(event) {
    setSelectedCourse(event.target.value);
    setSelectedPhase("");
  }

  function addTag(tag) {
    setSelectedTags((currentTags) => [...currentTags, tag]);
    setTagSearch("");
  }

  function removeTag(tagToRemove) {
    setSelectedTags((currentTags) =>
      currentTags.filter((tag) => tag !== tagToRemove),
    );
  }

  function clearFilters() {
    setSearch("");
    setSelectedCourse("");
    setSelectedPhase("");
    setSelectedTags([]);
    setTagSearch("");
    setTagsOpen(false);
    setCurrentPage(1);
  }

  const hasActiveFilters =
    search ||
    selectedCourse ||
    selectedPhase ||
    selectedTags.length > 0;

  return (
    <main className="projects-page">
      <section className="projects-page__content">
        <header className="projects-page__header">
          <h1>Projetos</h1>

          <p>
            Conheça os projetos desenvolvidos pelos estudantes do IFSC.
          </p>
        </header>

        <div className="projects-page__search">
          <SearchIcon />

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar projetos, autores ou tecnologias"
            aria-label="Buscar projetos"
          />

          {search && (
            <button
              type="button"
              className="projects-page__clear-search"
              onClick={() => setSearch("")}
              aria-label="Limpar busca"
              title="Limpar busca"
            >
              ×
            </button>
          )}
        </div>

        <div className="projects-page__filters">
          <div className="projects-page__select-group">
            <label htmlFor="course-filter">Curso</label>

            <select
              id="course-filter"
              value={selectedCourse}
              onChange={handleCourseChange}
            >
              <option value="">Todos os cursos</option>

              {Object.keys(COURSES).map((course) => (
                <option key={course} value={course}>
                  {course}
                </option>
              ))}
            </select>
          </div>

          <div className="projects-page__select-group">
            <label htmlFor="phase-filter">Fase</label>

            <select
              id="phase-filter"
              value={selectedPhase}
              onChange={(event) => setSelectedPhase(event.target.value)}
              disabled={!selectedCourse}
            >
              <option value="">
                {selectedCourse
                  ? "Todas as fases"
                  : "Selecione um curso"}
              </option>

              {phaseOptions.map((phase) => (
                <option key={phase} value={phase}>
                  {phase}
                </option>
              ))}
            </select>
          </div>

          <div
            className="projects-page__tag-filter"
            ref={tagsContainerRef}
          >
            <label htmlFor="tag-filter">Tecnologias</label>

            <button
              id="tag-filter"
              type="button"
              className={`projects-page__tag-button ${
                tagsOpen ? "is-open" : ""
              }`}
              onClick={() => setTagsOpen((current) => !current)}
              aria-expanded={tagsOpen}
              aria-haspopup="listbox"
            >
              <span>
                {selectedTags.length > 0
                  ? `${selectedTags.length} selecionada(s)`
                  : "Selecionar tecnologias"}
              </span>

              <ChevronIcon />
            </button>

            {tagsOpen && (
              <div className="projects-page__tag-dropdown">
                <div className="projects-page__tag-search">
                  <SearchIcon />

                  <input
                    type="search"
                    value={tagSearch}
                    onChange={(event) =>
                      setTagSearch(event.target.value)
                    }
                    placeholder="Buscar tecnologia"
                    aria-label="Buscar tecnologia"
                    autoFocus
                  />
                </div>

                <div
                  className="projects-page__tag-options"
                  role="listbox"
                  aria-label="Tecnologias disponíveis"
                >
                  {availableTags.length > 0 ? (
                    availableTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        role="option"
                        aria-selected="false"
                        onClick={() => addTag(tag)}
                      >
                        {tag}
                        <span aria-hidden="true">+</span>
                      </button>
                    ))
                  ) : (
                    <p>Nenhuma tecnologia encontrada.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            className="projects-page__clear-filters"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
          >
            Limpar filtros
          </button>
        </div>

        {(selectedCourse ||
          selectedPhase ||
          selectedTags.length > 0) && (
          <div
            className="projects-page__active-filters"
            aria-label="Filtros ativos"
          >
            {selectedCourse && (
              <FilterTag
                label={selectedCourse}
                type="course"
                onRemove={() => {
                  setSelectedCourse("");
                  setSelectedPhase("");
                }}
              />
            )}

            {selectedPhase && (
              <FilterTag
                label={selectedPhase}
                type="phase"
                onRemove={() => setSelectedPhase("")}
              />
            )}

            {selectedTags.map((tag) => (
              <FilterTag
                key={tag}
                label={tag}
                type="technology"
                onRemove={() => removeTag(tag)}
              />
            ))}
          </div>
        )}

        <div className="projects-page__result-information">
          <p>
            <strong>{filteredProjects.length}</strong>{" "}
            {filteredProjects.length === 1
              ? "projeto encontrado"
              : "projetos encontrados"}
          </p>
        </div>

        {visibleProjects.length > 0 ? (
          <div className="projects-page__grid">
            {visibleProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="projects-page__empty">
            <SearchIcon />

            <h2>Nenhum projeto encontrado</h2>

            <p>
              Tente alterar a busca ou remover alguns filtros.
            </p>

            <button type="button" onClick={clearFilters}>
              Limpar filtros
            </button>
          </div>
        )}

        {filteredProjects.length > ITEMS_PER_PAGE && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredProjects.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        )}
      </section>
    </main>
  );
}

function FilterTag({ label, type, onRemove }) {
  return (
    <span className={`projects-page__filter-tag ${type}`}>
      {label}

      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remover filtro ${label}`}
        title={`Remover ${label}`}
      >
        ×
      </button>
    </span>
  );
}

function ProjectCard({ project }) {
  return (
    <article className="project-card">
      <div
        className="project-card__image"
        style={{ backgroundColor: project.color }}
      >
        <BrowserPreview title={project.title} />
      </div>

      <div className="project-card__content">
        <h2>{project.title}</h2>

        <div className="project-card__author">
          <span className="project-card__avatar" aria-hidden="true">
            <UserIcon />
          </span>

          <div>
            <p>{project.author}</p>

            <span>
              {project.course} • {project.phase}
            </span>
          </div>
        </div>

        <div
          className="project-card__tags"
          aria-label="Tecnologias do projeto"
        >
          {project.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>

        <button
          type="button"
          className="project-card__details"
          disabled
          title="A página de detalhes será adicionada posteriormente"
        >
          Ver projeto
        </button>
      </div>
    </article>
  );
}

function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
}) {
  const startItem =
    totalItems === 0
      ? 0
      : (currentPage - 1) * itemsPerPage + 1;

  const endItem = Math.min(
    currentPage * itemsPerPage,
    totalItems,
  );

  const visiblePages = getVisiblePages(currentPage, totalPages);

  function changePage(page) {
    if (page < 1 || page > totalPages || page === currentPage) {
      return;
    }

    onPageChange(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <nav
      className="projects-pagination"
      aria-label="Paginação dos projetos"
    >
      <div className="projects-pagination__buttons">
        <button
          type="button"
          onClick={() => changePage(1)}
          disabled={currentPage === 1}
          aria-label="Primeira página"
          title="Primeira página"
        >
          «
        </button>

        <button
          type="button"
          onClick={() => changePage(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Página anterior"
          title="Página anterior"
        >
          ‹
        </button>

        {visiblePages.map((page, index) =>
          page === "..." ? (
            <span key={`ellipsis-${index}`}>…</span>
          ) : (
            <button
              key={page}
              type="button"
              className={
                page === currentPage ? "is-current" : ""
              }
              onClick={() => changePage(page)}
              aria-current={
                page === currentPage ? "page" : undefined
              }
            >
              {page}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => changePage(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Próxima página"
          title="Próxima página"
        >
          ›
        </button>

        <button
          type="button"
          onClick={() => changePage(totalPages)}
          disabled={currentPage === totalPages}
          aria-label="Última página"
          title="Última página"
        >
          »
        </button>
      </div>

      <p>
        Mostrando <strong>{startItem}–{endItem}</strong> de{" "}
        <strong>{totalItems}</strong> projetos
      </p>
    </nav>
  );
}

function getVisiblePages(currentPage, totalPages) {
  if (totalPages <= 5) {
    return Array.from(
      { length: totalPages },
      (_, index) => index + 1,
    );
  }

  if (currentPage <= 3) {
    return [1, 2, 3, "...", totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [
      1,
      "...",
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [1, "...", currentPage, "...", totalPages];
}

function BrowserPreview({ title }) {
  return (
    <div className="project-card__browser" aria-hidden="true">
      <div className="project-card__browser-header">
        <span />
        <span />
        <span />
      </div>

      <div className="project-card__browser-address">
        techub.ifsc/{title.toLowerCase().replaceAll(" ", "-")}
      </div>

      <div className="project-card__browser-body">
        <strong>{title}</strong>
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="11"
        cy="11"
        r="7"
        stroke="currentColor"
        strokeWidth="2"
      />

      <path
        d="m16.5 16.5 4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m6 9 6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" fill="currentColor" />

      <path
        d="M4 20c0-4 3.6-7 8-7s8 3 8 7"
        fill="currentColor"
      />
    </svg>
  );
}