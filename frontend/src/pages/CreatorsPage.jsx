import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import CustomSelect from "../components/CustomSelect";

import "./CreatorsPage.css";

const COURSE_PHASES = {
  "Ciência da Computação": 8,
  "Técnico em Informática para Internet": 4,
  "Técnico em Desenvolvimento de Sistemas": 3,
};

const CREATORS = [
  {
    id: 1,
    name: "Antoni Ferraz",
    course: "Ciência da Computação",
    phase: "8ª Fase",
    skills: ["React", "Front-end", "Figma"],
    initials: "AF",
    color: "#315b92",
  },
  {
    id: 2,
    name: "Gabriela Rodrigues",
    course: "Ciência da Computação",
    phase: "5ª Fase",
    skills: ["JavaScript", "UX/UI"],
    initials: "GR",
    color: "#8b3a57",
  },
  {
    id: 3,
    name: "Marcio Zurique",
    course: "Ciência da Computação",
    phase: "3ª Fase",
    skills: ["Node.js", "PostgreSQL"],
    initials: "MZ",
    color: "#555f68",
  },
  {
    id: 4,
    name: "Sérgio Tanque",
    course: "Ciência da Computação",
    phase: "7ª Fase",
    skills: ["Java", "Spring Boot"],
    initials: "ST",
    color: "#94602e",
  },
  {
    id: 5,
    name: "Lucas Mendes",
    course: "Técnico em Informática para Internet",
    phase: "4ª Fase",
    skills: ["HTML", "CSS", "React"],
    initials: "LM",
    color: "#347554",
  },
  {
    id: 6,
    name: "Fernanda Costa",
    course: "Técnico em Desenvolvimento de Sistemas",
    phase: "2ª Fase",
    skills: ["Flutter", "Mobile"],
    initials: "FC",
    color: "#65438a",
  },
  {
    id: 7,
    name: "Rafael Souza",
    course: "Ciência da Computação",
    phase: "7ª Fase",
    skills: ["Docker", "AWS"],
    initials: "RS",
    color: "#356c74",
  },
  {
    id: 8,
    name: "Marina Oliveira",
    course: "Técnico em Desenvolvimento de Sistemas",
    phase: "3ª Fase",
    skills: ["Python", "Data Science"],
    initials: "MO",
    color: "#775060",
  },
];

export default function CreatorsPage() {
  const [search, setSearch] = useState("");
  const [course, setCourse] = useState("");
  const [phase, setPhase] = useState("");

  const phaseOptions = course
    ? Array.from(
        { length: COURSE_PHASES[course] },
        (_, index) => `${index + 1}ª Fase`,
      )
    : [];

  const filteredCreators = useMemo(() => {
    const searchTerm = search.trim().toLocaleLowerCase("pt-BR");

    return CREATORS.filter((creator) => {
      const matchesSearch =
        !searchTerm ||
        creator.name.toLocaleLowerCase("pt-BR").includes(searchTerm) ||
        creator.skills.some((skill) =>
          skill.toLocaleLowerCase("pt-BR").includes(searchTerm),
        );

      const matchesCourse = !course || creator.course === course;

      const matchesPhase = !phase || creator.phase === phase;

      return matchesSearch && matchesCourse && matchesPhase;
    });
  }, [search, course, phase]);

  function handleCourseChange(event) {
    setCourse(event.target.value);
    setPhase("");
  }

  function clearFilters() {
    setSearch("");
    setCourse("");
    setPhase("");
  }

  const hasFilters = Boolean(search || course || phase);

  return (
    <main className="creators-page">
      <section className="creators-page__hero">
        <h1>Encontre criadores</h1>

        <p>
          Conheça estudantes, suas habilidades e os projetos desenvolvidos no
          IFSC.
        </p>
      </section>

      <section
        className="creators-page__filters"
        aria-label="Filtros de criadores"
      >
        <div className="creators-page__search">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome ou tecnologia"
            aria-label="Buscar criadores"
          />

          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Limpar busca"
              title="Limpar busca"
            >
              ×
            </button>
          )}
        </div>

        <div className="creators-page__filter-grid">
          <label>
            <span>Curso</span>

            <CustomSelect
              id="creator-course-filter"
              value={course}
              onChange={handleCourseChange}
              placeholder="Todos os cursos"
              options={[
                {
                  value: "",
                  label: "Todos os cursos",
                },
                ...Object.keys(COURSE_PHASES).map((courseOption) => ({
                  value: courseOption,
                  label: courseOption,
                })),
              ]}
            />
          </label>

          <label>
            <span>Fase</span>

            <CustomSelect
              id="creator-phase-filter"
              value={phase}
              onChange={(event) => setPhase(event.target.value)}
              disabled={!course}
              placeholder={course ? "Todas as fases" : "Selecione um curso"}
              options={[
                {
                  value: "",
                  label: course ? "Todas as fases" : "Selecione um curso",
                },
                ...phaseOptions.map((phaseOption) => ({
                  value: phaseOption,
                  label: phaseOption,
                })),
              ]}
            />
          </label>

          <button
            type="button"
            className="creators-page__clear"
            onClick={clearFilters}
            disabled={!hasFilters}
          >
            Limpar filtros
          </button>
        </div>

        <p className="creators-page__result-count">
          <strong>{filteredCreators.length}</strong>{" "}
          {filteredCreators.length === 1
            ? "criador encontrado"
            : "criadores encontrados"}
        </p>
      </section>

      {filteredCreators.length > 0 ? (
        <section
          className="creators-page__grid"
          aria-label="Criadores encontrados"
        >
          {filteredCreators.map((creator) => (
            <Link
              to={`/criadores/${creator.id}`}
              className="creator-card"
              key={creator.id}
              aria-label={`Abrir perfil de ${creator.name}`}
            >
              <div
                className="creator-card__cover"
                style={{
                  "--creator-color": creator.color,
                }}
              />

              <div
                className="creator-card__avatar"
                style={{
                  "--creator-color": creator.color,
                }}
                aria-hidden="true"
              >
                {creator.initials}
              </div>

              <div className="creator-card__content">
                <h2>{creator.name}</h2>

                <p>{creator.course}</p>

                <span className="creator-card__phase">{creator.phase}</span>

                <div
                  className="creator-card__skills"
                  aria-label={`Tecnologias de ${creator.name}`}
                >
                  {creator.skills.map((skill) => (
                    <span key={skill}>{skill}</span>
                  ))}
                </div>

                <span className="creator-card__portfolio">
                  <i
                    className="fa-solid fa-arrow-up-right-from-square"
                    aria-hidden="true"
                  />
                  Ver perfil
                </span>
              </div>
            </Link>
          ))}
        </section>
      ) : (
        <section className="creators-page__empty">
          <i className="fa-solid fa-user-group" aria-hidden="true" />

          <h2>Nenhum criador encontrado</h2>

          <p>Tente alterar a busca ou remover os filtros selecionados.</p>

          <button type="button" onClick={clearFilters}>
            Limpar filtros
          </button>
        </section>
      )}
    </main>
  );
}
