import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { fetchAllPublicProjects } from "../api/creators";
import CustomSelect from "../components/CustomSelect";
import Pagination from "../components/Pagination";
import Spinner from "../components/Spinner";
import { buildCreatorsFromProjects } from "../utils/creators";
import { readSessionState, writeSessionState } from "../utils/sessionState";

import "./CreatorsPage.css";

const COURSES = [
  "Ciência da Computação",
  "Técnico em Informática para Internet",
  "Técnico em Desenvolvimento de Sistemas",
];

const ITEMS_PER_PAGE = 8;

// Filtros e página ficam guardados na aba: ao abrir um perfil e voltar, a lista continua igual.
const FILTERS_KEY = "techub:criadores:filtros";
const DEFAULT_FILTERS = { search: "", course: "", technology: "", page: 1 };

function readSavedFilters() {
  const saved = readSessionState(FILTERS_KEY, DEFAULT_FILTERS);
  return {
    search: typeof saved.search === "string" ? saved.search : "",
    course: typeof saved.course === "string" ? saved.course : "",
    technology: typeof saved.technology === "string" ? saved.technology : "",
    page: Number.isInteger(saved.page) && saved.page > 0 ? saved.page : 1,
  };
}

export default function CreatorsPage() {
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [savedFilters] = useState(readSavedFilters);
  const [search, setSearch] = useState(savedFilters.search);
  const [course, setCourse] = useState(savedFilters.course);
  const [technology, setTechnology] = useState(savedFilters.technology);
  const [currentPage, setCurrentPage] = useState(savedFilters.page);
  const previousFiltersRef = useRef(null);

  useEffect(() => {
    let active = true;

    async function loadCreators() {
      try {
        setLoading(true);
        setError("");
        const projects = await fetchAllPublicProjects();
        if (active) setCreators(buildCreatorsFromProjects(projects));
      } catch {
        if (active) setError("Não foi possível carregar os criadores.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadCreators();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  // Lista única de tecnologias dos criadores
  const availableTechnologies = useMemo(() => {
    const techSet = new Set();
    creators.forEach((creator) => {
      if (Array.isArray(creator.skills)) {
        creator.skills.forEach((skill) => techSet.add(skill));
      }
    });
    return Array.from(techSet).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [creators]);

  const filteredCreators = useMemo(() => {
    const searchTerm = search.trim().toLocaleLowerCase("pt-BR");

    return creators.filter((creator) => {
      const matchesSearch =
        !searchTerm ||
        creator.name.toLocaleLowerCase("pt-BR").includes(searchTerm) ||
        creator.skills.some((skill) =>
          skill.toLocaleLowerCase("pt-BR").includes(searchTerm),
        );

      const matchesCourse = !course || creator.course === course;

      const matchesTechnology =
        !technology ||
        (Array.isArray(creator.skills) && creator.skills.includes(technology));

      return matchesSearch && matchesCourse && matchesTechnology;
    });
  }, [creators, search, course, technology]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCreators.length / ITEMS_PER_PAGE)
  );

  const visibleCreators = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCreators.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredCreators, currentPage]);

  // Mudar um filtro volta para a primeira página; ao montar (filtros restaurados) mantém a página guardada.
  useEffect(() => {
    const filtersKey = JSON.stringify([search, course, technology]);
    if (previousFiltersRef.current !== null && previousFiltersRef.current !== filtersKey) {
      setCurrentPage(1);
    }
    previousFiltersRef.current = filtersKey;
  }, [search, course, technology]);

  useEffect(() => {
    writeSessionState(FILTERS_KEY, { search, course, technology, page: currentPage });
  }, [search, course, technology, currentPage]);

  // A página guardada pode não existir mais (menos criadores que antes): vai para a última.
  useEffect(() => {
    if (!loading && currentPage > totalPages) setCurrentPage(totalPages);
  }, [loading, currentPage, totalPages]);

  // Limpa todos os filtros incluindo a tecnologia
  function clearFilters() {
    setSearch("");
    setCourse("");
    setTechnology("");
  }

  const hasFilters = Boolean(search || course || technology);

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
              onChange={(event) => setCourse(event.target.value)}
              placeholder="Todos os cursos"
              options={[
                { value: "", label: "Todos os cursos" },
                ...COURSES.map((courseOption) => ({
                  value: courseOption,
                  label: courseOption,
                })),
              ]}
            />
          </label>

          <label>
            <span>Áreas de interesse</span>
            <CustomSelect
              id="creator-tech-filter"
              value={technology}
              onChange={(event) => setTechnology(event.target.value)}
              placeholder="Todas as tecnologias"
              options={[
                { value: "", label: "Todas as áreas" },
                ...availableTechnologies.map((tech) => ({
                  value: tech,
                  label: tech,
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

      {loading ? (
        <Spinner size="lg" label="Carregando criadores..." />
      ) : error ? (
        <section className="creators-page__empty">
          <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
          <h2>{error}</h2>
          <p>Verifique sua conexão e tente novamente.</p>
          <button type="button" onClick={() => setReloadKey((key) => key + 1)}>
            Tentar novamente
          </button>
        </section>
      ) : filteredCreators.length > 0 ? (
        <section
          className="creators-page__grid"
          aria-label="Criadores encontrados"
        >
          {visibleCreators.map((creator) => (
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
                  ...(creator.bannerUrl && {
                    backgroundImage: `url("${creator.bannerUrl}")`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }),
                }}
              />

              <div
                className="creator-card__avatar"
                style={{
                  "--creator-color": creator.color,
                }}
                aria-hidden="true"
              >
                {creator.avatarUrl ? (
                  <img src={creator.avatarUrl} alt="" className="creator-card__photo" />
                ) : (
                  creator.initials
                )}
              </div>

              <div className="creator-card__content">
                <h2>{creator.name}</h2>
                <p>{creator.course || "Curso não informado"}</p>
                <span className="creator-card__projects">
                  {creator.projectCount}{" "}
                  {creator.projectCount === 1
                    ? "projeto publicado"
                    : "projetos publicados"}
                </span>

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
          {hasFilters ? (
            <>
              <p>Tente alterar a busca ou remover os filtros selecionados.</p>
              <button type="button" onClick={clearFilters}>
                Limpar filtros
              </button>
            </>
          ) : (
            <p>Os criadores aparecem aqui quando têm um projeto aprovado.</p>
          )}
        </section>
      )}

      {!loading && !error && filteredCreators.length > ITEMS_PER_PAGE && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredCreators.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
          itemLabel="criadores"
          ariaLabel="Paginação dos criadores"
        />
      )}
    </main>
  );
}