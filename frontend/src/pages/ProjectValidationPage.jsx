import { useEffect, useState } from "react";

import {
  approveProject,
  fetchModerationProjects,
  rejectProject,
} from "../api/moderation";
import ConfirmationModal from "../components/ConfirmationModal";
import { safeExternalUrl } from "../utils/externalUrl";
import { getSlaStatus } from "../utils/moderationSla";
import { getYoutubeVideoId } from "../utils/youtube";

import "./ProjectValidationPage.css";

const STATUS_LABELS = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
};

const FILTERS = [
  ["pending", "Pendentes"],
  ["approved", "Aprovados"],
  ["rejected", "Rejeitados"],
  ["all", "Todos"],
];

const EMPTY_TOTALS = { pending: 0, approved: 0, rejected: 0 };
const MAX_REVIEW_NOTES_LENGTH = 1000;

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data não informada";

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Imagens usam a própria URL; vídeos do YouTube usam a miniatura do vídeo.
function getMediaPreview(item) {
  if (item.mediaType === "image") return item.url;

  const youtubeId = getYoutubeVideoId(item.url);
  return youtubeId
    ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
    : null;
}

function getMediaLabel(item) {
  if (item.mediaType === "image") {
    return item.isCover ? "Imagem de capa" : "Imagem";
  }

  return getYoutubeVideoId(item.url) ? "Vídeo do YouTube" : "Vídeo";
}

export default function ProjectValidationPage() {
  const [projects, setProjects] = useState([]);
  const [totals, setTotals] = useState(EMPTY_TOTALS);
  const [slaDays, setSlaDays] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [decision, setDecision] = useState(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [decisionError, setDecisionError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");

  // Carrega a fila da situação escolhida; recarrega após cada decisão.
  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");

    fetchModerationProjects(filter)
      .then((data) => {
        if (!active) return;

        const loadedProjects = Array.isArray(data.projects)
          ? data.projects
          : [];

        setProjects(loadedProjects);
        setTotals(data.totals || EMPTY_TOTALS);
        setSlaDays(data.slaDays ?? null);
        setSelectedId((currentId) =>
          loadedProjects.some((project) => project.id === currentId)
            ? currentId
            : loadedProjects[0]?.id ?? null,
        );
      })
      .catch((requestError) => {
        if (!active) return;

        setProjects([]);
        setSelectedId(null);
        setError(
          requestError.response?.status === 403
            ? "Esta área é exclusiva para administradores."
            : "Não foi possível carregar os projetos. Verifique se o servidor está ativo.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filter, reloadKey]);

  const selectedProject =
    projects.find((project) => project.id === selectedId) || null;

  const now = new Date();

  function getProjectSla(project) {
    return project.approvalStatus === "pending"
      ? getSlaStatus(project, now)
      : null;
  }

  function selectFilter(nextFilter) {
    setFeedback("");
    setFilter(nextFilter);
  }

  function openDecision(nextDecision) {
    setReviewNotes("");
    setDecisionError("");
    setDecision(nextDecision);
  }

  function closeDecision() {
    if (submitting) return;
    setDecision(null);
  }

  async function confirmDecision() {
    if (!selectedProject || submitting) return;

    const notes = reviewNotes.trim();

    if (decision === "rejected" && !notes) {
      setDecisionError("Informe a justificativa da rejeição.");
      return;
    }

    setSubmitting(true);
    setDecisionError("");

    try {
      const { project: reviewed } =
        decision === "approved"
          ? await approveProject(selectedProject.id, notes)
          : await rejectProject(selectedProject.id, notes);

      setFeedback(
        decision === "approved"
          ? `"${selectedProject.title}" foi aprovado e já aparece publicamente.`
          : `"${selectedProject.title}" foi rejeitado. O criador verá a justificativa.`,
      );

      // Reflete a decisão na hora, para o projeto não continuar na tela como
      // pendente; a recarga em seguida atualiza os totais e a fila.
      setProjects((currentProjects) =>
        currentProjects
          .map((project) =>
            project.id === reviewed.id ? { ...project, ...reviewed } : project,
          )
          .filter(
            (project) => filter === "all" || project.approvalStatus === filter,
          ),
      );
      setDecision(null);
      setReloadKey((currentKey) => currentKey + 1);
    } catch (requestError) {
      const data = requestError.response?.data;
      setDecisionError(
        data?.errors?.[0]?.message ||
          data?.message ||
          "Não foi possível registrar a decisão. Tente novamente.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const selectedSla = selectedProject ? getProjectSla(selectedProject) : null;
  const githubUrl = safeExternalUrl(selectedProject?.githubURL);
  const liveUrl = safeExternalUrl(selectedProject?.liveURL);
  const technologies = selectedProject?.technologies || [];
  const collaborators = selectedProject?.collaborators || [];
  const media = selectedProject?.media || [];
  const isRejecting = decision === "rejected";

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
          {FILTERS.map(([value, label]) => (
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

        {feedback && (
          <p className="validation-page__feedback" role="status">
            <i className="fa-solid fa-circle-check" aria-hidden="true" />
            {feedback}
          </p>
        )}

        <div className="validation-page__workspace">
          <aside className="validation-list">
            <div className="validation-list__header">
              <strong>Projetos</strong>
              <span>{projects.length}</span>
            </div>

            <div className="validation-list__items">
              {projects.map((project) => {
                const sla = getProjectSla(project);

                return (
                  <button
                    key={project.id}
                    type="button"
                    className={`validation-list__item${
                      selectedProject?.id === project.id ? " is-selected" : ""
                    }`}
                    onClick={() => setSelectedId(project.id)}
                  >
                    <span className="validation-list__project-icon">
                      <i
                        className="fa-regular fa-folder-open"
                        aria-hidden="true"
                      />
                    </span>

                    <span className="validation-list__content">
                      <strong>{project.title}</strong>
                      <small>{project.author?.name || "Criador"}</small>
                      <time dateTime={project.submittedAt}>
                        Enviado em {formatDateTime(project.submittedAt)}
                      </time>

                      {sla && (
                        <span className={`validation-sla is-${sla.tone}`}>
                          <i className="fa-regular fa-clock" aria-hidden="true" />
                          {sla.label}
                        </span>
                      )}
                    </span>

                    <span
                      className={`validation-status is-${project.approvalStatus}`}
                    >
                      {STATUS_LABELS[project.approvalStatus]}
                    </span>
                  </button>
                );
              })}

              {loading && projects.length === 0 && (
                <div className="validation-list__empty" role="status">
                  <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
                  <strong>Carregando projetos...</strong>
                </div>
              )}

              {!loading && error && (
                <div className="validation-list__empty" role="alert">
                  <i
                    className="fa-solid fa-triangle-exclamation"
                    aria-hidden="true"
                  />
                  <strong>{error}</strong>
                  <button
                    type="button"
                    className="validation-list__retry"
                    onClick={() => setReloadKey((currentKey) => currentKey + 1)}
                  >
                    Tentar novamente
                  </button>
                </div>
              )}

              {!loading && !error && projects.length === 0 && (
                <div className="validation-list__empty">
                  <i className="fa-regular fa-circle-check" aria-hidden="true" />
                  <strong>Nenhum projeto encontrado</strong>
                  <span>
                    {filter === "pending"
                      ? "Não há projetos aguardando análise."
                      : "Não existem projetos com esse status."}
                  </span>
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
                      className={`validation-status is-${selectedProject.approvalStatus}`}
                    >
                      {STATUS_LABELS[selectedProject.approvalStatus]}
                    </span>
                    <h2>{selectedProject.title}</h2>
                    <p>
                      Enviado por {selectedProject.author?.name || "Criador"}
                      {selectedProject.author?.email &&
                        ` (${selectedProject.author.email})`}
                    </p>
                  </div>
                </div>

                {selectedSla && (
                  <div className={`validation-deadline is-${selectedSla.tone}`}>
                    <div className="validation-deadline__header">
                      <span>
                        <i className="fa-regular fa-clock" aria-hidden="true" />
                        Prazo de análise
                        {slaDays && ` (${slaDays} ${slaDays === 1 ? "dia" : "dias"})`}
                      </span>
                      <strong>{selectedSla.label}</strong>
                    </div>

                    <div
                      className="validation-deadline__bar"
                      role="progressbar"
                      aria-label="Prazo de análise consumido"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={selectedSla.progress}
                    >
                      <span style={{ width: `${selectedSla.progress}%` }} />
                    </div>

                    <div className="validation-deadline__dates">
                      <span>
                        Enviado em {formatDateTime(selectedProject.submittedAt)}
                      </span>
                      <span>
                        Vence em {formatDateTime(selectedProject.dueAt)}
                      </span>
                    </div>
                  </div>
                )}

                {selectedProject.reviewedAt &&
                  selectedProject.approvalStatus !== "pending" && (
                    <div
                      className={`validation-review-result is-${selectedProject.approvalStatus}`}
                    >
                      <h3>
                        {selectedProject.approvalStatus === "rejected"
                          ? "Justificativa da rejeição"
                          : "Parecer da aprovação"}
                      </h3>
                      <p>
                        {selectedProject.reviewNotes ||
                          "Aprovado sem comentários."}
                      </p>
                      <small>
                        Analisado em{" "}
                        {formatDateTime(selectedProject.reviewedAt)}
                      </small>
                    </div>
                  )}

                {selectedProject.reviewedAt &&
                  selectedProject.approvalStatus === "pending" && (
                    <div className="validation-review-result is-pending">
                      <h3>Reenviado após rejeição</h3>
                      <p>{selectedProject.reviewNotes}</p>
                      <small>
                        Rejeitado em{" "}
                        {formatDateTime(selectedProject.reviewedAt)}
                      </small>
                    </div>
                  )}

                <div className="validation-details__section">
                  <h3>Descrição do projeto</h3>
                  <p>{selectedProject.description}</p>
                </div>

                <div className="validation-details__metadata">
                  <div>
                    <span>Curso</span>
                    <strong>{selectedProject.major || "Não informado"}</strong>
                  </div>

                  <div>
                    <span>Fase</span>
                    <strong>
                      {selectedProject.semester > 0
                        ? `${selectedProject.semester}ª fase`
                        : "Não informada"}
                    </strong>
                  </div>

                  <div>
                    <span>Envio</span>
                    <strong>
                      {formatDateTime(selectedProject.submittedAt)}
                    </strong>
                  </div>
                </div>

                {technologies.length > 0 && (
                  <div className="validation-details__section">
                    <h3>Tecnologias</h3>

                    <div className="validation-details__technologies">
                      {technologies.map((technology) => (
                        <span key={technology}>{technology}</span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedProject.status && (
                  <div className="validation-details__section validation-details__inline-section">
                    <h3>Status de desenvolvimento</h3>

                    <span className="validation-details__development-status">
                      <i
                        className="fa-solid fa-code-branch"
                        aria-hidden="true"
                      />
                      {selectedProject.status}
                    </span>
                  </div>
                )}

                {collaborators.length > 0 && (
                  <div className="validation-details__section">
                    <h3>Colaboradores</h3>

                    <div className="validation-details__collaborators">
                      {collaborators.map((collaborator) => (
                        <div
                          key={collaborator.userId}
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

                {(githubUrl || liveUrl) && (
                  <div className="validation-details__section">
                    <h3>Links do projeto</h3>

                    <div className="validation-details__links">
                      {githubUrl && (
                        <a href={githubUrl} target="_blank" rel="noreferrer">
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

                      {liveUrl && (
                        <a href={liveUrl} target="_blank" rel="noreferrer">
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

                {media.length > 0 && (
                  <div className="validation-details__section">
                    <h3>Galeria do projeto</h3>

                    <div className="validation-details__gallery">
                      {media.map((file) => {
                        const preview = getMediaPreview(file);
                        const label = getMediaLabel(file);

                        return (
                          <a
                            key={file.id}
                            className="validation-details__media"
                            href={safeExternalUrl(file.url) || undefined}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <div className="validation-details__media-preview">
                              {preview ? (
                                <img
                                  src={preview}
                                  alt={`Pré-visualização: ${label}`}
                                  loading="lazy"
                                />
                              ) : (
                                <i
                                  className="fa-solid fa-film"
                                  aria-hidden="true"
                                />
                              )}

                              {file.mediaType === "video" && (
                                <span className="validation-details__play">
                                  <i
                                    className="fa-solid fa-play"
                                    aria-hidden="true"
                                  />
                                </span>
                              )}
                            </div>

                            <div className="validation-details__media-info">
                              <strong>{label}</strong>
                              <span>Abrir em nova aba</span>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="validation-details__actions">
                  {selectedProject.approvalStatus !== "rejected" && (
                    <button
                      type="button"
                      className="validation-details__reject"
                      onClick={() => openDecision("rejected")}
                    >
                      <i className="fa-solid fa-xmark" aria-hidden="true" />
                      Rejeitar projeto
                    </button>
                  )}

                  {selectedProject.approvalStatus !== "approved" && (
                    <button
                      type="button"
                      className="validation-details__approve"
                      onClick={() => openDecision("approved")}
                    >
                      <i className="fa-solid fa-check" aria-hidden="true" />
                      Aprovar projeto
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="validation-details__empty">
                <i className="fa-regular fa-folder-open" aria-hidden="true" />
                <strong>
                  {loading ? "Carregando..." : "Selecione um projeto"}
                </strong>
                {!loading && (
                  <span>
                    Escolha um projeto da lista para iniciar a análise.
                  </span>
                )}
              </div>
            )}
          </article>
        </div>
      </div>

      <ConfirmationModal
        open={decision !== null}
        tone={isRejecting ? "danger" : "primary"}
        title={isRejecting ? "Rejeitar este projeto?" : "Aprovar este projeto?"}
        description={
          isRejecting
            ? `O projeto "${selectedProject?.title}" não ficará público. O criador verá a justificativa abaixo.`
            : `O projeto "${selectedProject?.title}" passará a aparecer publicamente.`
        }
        confirmLabel={
          submitting
            ? "Salvando..."
            : isRejecting
              ? "Sim, rejeitar"
              : "Sim, aprovar"
        }
        confirmDisabled={submitting || (isRejecting && !reviewNotes.trim())}
        onCancel={closeDecision}
        onConfirm={confirmDecision}
      >
        <div className="validation-review">
          <label htmlFor="validation-review-notes">
            {isRejecting
              ? "Justificativa da rejeição (obrigatória)"
              : "Comentário para o criador (opcional)"}
          </label>

          <textarea
            id="validation-review-notes"
            rows={4}
            maxLength={MAX_REVIEW_NOTES_LENGTH}
            value={reviewNotes}
            onChange={(event) => {
              setReviewNotes(event.target.value);
              setDecisionError("");
            }}
            placeholder={
              isRejecting
                ? "Explique o que precisa ser ajustado para o projeto ser aprovado."
                : "Ex.: Ótimo trabalho, projeto aprovado!"
            }
            aria-invalid={Boolean(decisionError)}
            aria-describedby="validation-review-help"
            disabled={submitting}
            autoFocus
          />

          <div id="validation-review-help" className="validation-review__help">
            <span role="alert">{decisionError}</span>
            <span>
              {reviewNotes.length}/{MAX_REVIEW_NOTES_LENGTH}
            </span>
          </div>
        </div>
      </ConfirmationModal>
    </section>
  );
}
