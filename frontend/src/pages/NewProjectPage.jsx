import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import CustomSelect from "../components/CustomSelect";
import { API_URL } from "../api/apiUrl";
import CollaboratorAvatar from "../components/CollaboratorAvatar";
import ProjectGallery from "../components/ProjectGallery";
import { useProjectMedia } from "../hooks/useProjectMedia";
import { useAuth } from "../context/AuthContext";
import Spinner from "../components/Spinner";
import { descriptionToPlainText, descriptionToSafeHtml } from "../utils/richText";
import "./NewProjectPage.css";

const MAX_DESCRIPTION_LENGTH = 3000;
const MAX_TAGS = 8;
const COURSE_PHASES = {
  "Ciência da Computação": 8,
  "Técnico em Informática para Internet": 4,
  "Técnico em Desenvolvimento de Sistemas": 3,
};

const TECHNOLOGY_OPTIONS = [
  "Adobe XD", "Android", "Angular", "Arduino", "ASP.NET", "AWS", "Azure",
  "Back-end", "Bootstrap", "C", "C#", "C++", "CI/CD", "Cloud Computing",
  "CSS", "Dart", "Data Science", "Django", "Docker", "Express", "Figma",
  "Firebase", "Flask", "Flutter", "Front-end", "Full Stack", "Git", "GitHub",
  "GitLab", "Go", "Google Cloud", "GraphQL", "HTML", "Inteligência Artificial",
  "Ionic", "Java", "JavaScript", "Jest", "Kotlin", "Kubernetes", "Laravel",
  "Linux", "Machine Learning", "MariaDB", "Material UI", "Mobile", "MongoDB",
  "MySQL", "NestJS", "Next.js", "Node.js", "NoSQL", "Nuxt.js", "Oracle",
  "PHP", "PostgreSQL", "Python", "React", "React Native", "Redis", "REST API",
  "Ruby", "Rust", "Sass", "Spring Boot", "SQL", "SQLite", "Svelte", "Swift",
  "Tailwind CSS", "TypeScript", "Unity", "Unreal Engine", "UX/UI", "Vue.js",
  "Web", "WebSocket", "WordPress",
];

const STATUS_OPTIONS = [
  "Em design",
  "Em desenvolvimento",
  "Concluído",
  "Pausado",
];

const COLLABORATOR_RULES = [
  "Enquanto for rascunho, o projeto não aparece publicamente.",
  "Os colaboradores terão acesso ao projeto depois do envio.",
  "Somente o proprietário pode excluir o projeto.",
];

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validateForm({ title, descriptionText, course, phase, tags, github, liveUrl, mediaCount }) {
  const errors = {};

  if (!title.trim()) errors.title = "O título é obrigatório.";
  else if (title.trim().length < 3) errors.title = "Informe pelo menos 3 caracteres.";
  else if (/[<>]/.test(title)) errors.title = "Não use os caracteres < ou >.";

  if (!descriptionText.trim()) errors.description = "Descreva o projeto antes de enviar.";
  else if (descriptionText.trim().length < 20) errors.description = "A descrição deve possuir pelo menos 20 caracteres.";

  if (!course) errors.course = "Selecione o curso relacionado ao projeto.";
  if (!phase) errors.phase = "Selecione a fase relacionada ao projeto.";
  if (tags.length === 0) errors.tags = "Adicione pelo menos uma tecnologia.";

  if (github.trim() && !isValidUrl(github.trim())) errors.github = "Informe uma URL válida, começando com http:// ou https://.";
  if (liveUrl.trim() && !isValidUrl(liveUrl.trim())) errors.liveUrl = "Informe uma URL válida, começando com http:// ou https://.";
  if (mediaCount === 0) errors.files = "Adicione pelo menos uma imagem, vídeo ou link do YouTube.";

  return errors;
}

export default function NewProjectPage() {
  const { draftId } = useParams();
  const { user } = useAuth();
  return <ProjectForm key={`${user.id}:${draftId || "new"}`} draftId={draftId} user={user} />;
}

function ProjectForm({ draftId, user }) {
  const navigate = useNavigate();
  const [currentDraftId, setCurrentDraftId] = useState(draftId || null);
  const [isLoadingDraft, setIsLoadingDraft] = useState(Boolean(draftId));
  const [loadError, setLoadError] = useState("");
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const isEditing = Boolean(currentDraftId);

  const editorRef = useRef(null);
  const tagsContainerRef = useRef(null);
  const collaboratorContainerRef = useRef(null);

  const [activeFormats, setActiveFormats] = useState({
    bold: false, italic: false, underline: false, strikeThrough: false,
    unorderedList: false, orderedList: false, justifyLeft: false,
    justifyCenter: false, justifyRight: false,
  });

  const [title, setTitle] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState("");
  const [descriptionText, setDescriptionText] = useState("");
  const [course, setCourse] = useState("");
  const [phase, setPhase] = useState("");

  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState([]);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [activeTagIndex, setActiveTagIndex] = useState(0);

  const [collaboratorInput, setCollaboratorInput] = useState("");
  const [collaborators, setCollaborators] = useState([]);
  const [collaboratorOptions, setCollaboratorOptions] = useState([]);
  const [collaboratorSearchStatus, setCollaboratorSearchStatus] = useState("idle");
  const [collaboratorsOpen, setCollaboratorsOpen] = useState(false);

  const [github, setGithub] = useState("");
  const [liveUrl, setLiveUrl] = useState("");
  const [status, setStatus] = useState("Em design");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackType, setFeedbackType] = useState("");

  const gallery = useProjectMedia({
    onError: (message) =>
      message ? setErrors((curr) => ({ ...curr, files: message })) : clearFieldError("files"),
  });

  const { loadDraftMedia } = gallery;

  // Carrega o rascunho da nova API do Backend
  useEffect(() => {
    if (!draftId) return;
    let cancelled = false;

    const fetchDraft = async () => {
      try {
        const token = localStorage.getItem("techub_token") || localStorage.getItem("token");
        const res = await fetch(`${API_URL}/projects/${draftId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Rascunho não encontrado no servidor.");
        const data = await res.json();

        if (cancelled) return;
        const draft = data.project;

        setTitle(draft.title || "");
        setDescriptionHtml(descriptionToSafeHtml(draft.description));
        setDescriptionText(descriptionToPlainText(draft.description));
        setCourse(draft.major || "");
        setPhase(draft.semester ? `${draft.semester}ª Fase` : "");
        setTags(draft.technologies || []);
        setCollaborators(draft.collaborators || []);
        setGithub(draft.githubURL || "");
        setLiveUrl(draft.liveURL || "");
        setStatus(draft.status || "Em design");
        setSavedAt(draft.updatedAt);
        loadDraftMedia(draft.media);
      } catch (error) {
        if (!cancelled) setLoadError(error.message);
      } finally {
        if (!cancelled) setIsLoadingDraft(false);
      }
    };

    fetchDraft();
    return () => { cancelled = true; };
  }, [draftId, user.id, loadDraftMedia]);

  useEffect(() => {
    if (!isLoadingDraft && draftId && editorRef.current) {
      editorRef.current.innerHTML = descriptionToSafeHtml(descriptionHtml);
    }
  }, [isLoadingDraft, draftId, descriptionHtml]);

  const phaseOptions = course
    ? Array.from({ length: COURSE_PHASES[course] }, (_, index) => `${index + 1}ª Fase`)
    : [];

  const filteredTags = useMemo(() => {
    const search = tagInput.trim().toLowerCase();
    return TECHNOLOGY_OPTIONS.filter((technology) => {
      return technology.toLowerCase().includes(search) && !tags.includes(technology);
    }).slice(0, 10);
  }, [tagInput, tags]);

  useEffect(() => {
    const query = collaboratorInput.trim();
    if (query.length < 2) {
      setCollaboratorOptions([]);
      setCollaboratorSearchStatus("idle");
      return;
    }

    const controller = new AbortController();
    setCollaboratorOptions([]);
    setCollaboratorSearchStatus("searching");

    const timer = setTimeout(async () => {
      try {
        const token = localStorage.getItem("techub_token") || localStorage.getItem("token");
        const response = await fetch(`${API_URL}/projects/collaborators/search?q=${encodeURIComponent(query)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Falha ao pesquisar");
        const data = await response.json();
        if (!controller.signal.aborted) {
          setCollaboratorOptions(Array.isArray(data.users) ? data.users : []);
          setCollaboratorSearchStatus("done");
        }
      } catch (error) {
        if (error.name !== "AbortError" && !controller.signal.aborted) {
          setCollaboratorOptions([]);
          setCollaboratorSearchStatus("error");
        }
      }
    }, 250);

    return () => { clearTimeout(timer); controller.abort(); };
  }, [collaboratorInput]);

  const collaboratorSuggestions = useMemo(() => {
    return collaboratorOptions.filter((person) => {
      return !collaborators.some((c) => c.id === person.id || c.userId === person.id);
    });
  }, [collaboratorOptions, collaborators]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (tagsContainerRef.current && !tagsContainerRef.current.contains(event.target)) setTagsOpen(false);
      if (collaboratorContainerRef.current && !collaboratorContainerRef.current.contains(event.target)) setCollaboratorsOpen(false);
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    function handleSelectionChange() {
      const editor = editorRef.current;
      const selection = window.getSelection();
      if (!editor || !selection || !selection.anchorNode || !editor.contains(selection.anchorNode)) return;

      setActiveFormats({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        strikeThrough: document.queryCommandState("strikeThrough"),
        unorderedList: document.queryCommandState("insertUnorderedList"),
        orderedList: document.queryCommandState("insertOrderedList"),
        justifyLeft: document.queryCommandState("justifyLeft"),
        justifyCenter: document.queryCommandState("justifyCenter"),
        justifyRight: document.queryCommandState("justifyRight"),
      });
    }
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, []);

  function clearFieldError(field) {
    setErrors((currentErrors) => ({ ...currentErrors, [field]: "" }));
    setFeedbackMessage("");
    setFeedbackType("");
  }

  function handleTitleChange(event) {
    setTitle(event.target.value);
    clearFieldError("title");
  }

  function handleCourseChange(event) {
    setCourse(event.target.value);
    setPhase("");
    clearFieldError("course");
    clearFieldError("phase");
  }

  function handleEditorInput(event) {
    const editor = event.currentTarget;
    const text = editor.innerText;

    if (text.length > MAX_DESCRIPTION_LENGTH) {
      editor.innerHTML = descriptionHtml;
      moveCursorToEnd(editor);
      return;
    }

    setDescriptionHtml(editor.innerHTML);
    setDescriptionText(text);
    clearFieldError("description");
  }

  function handleEditorBeforeInput(event) {
    const isInsertion = event.nativeEvent.inputType?.startsWith("insert");
    if (isInsertion && descriptionText.length >= MAX_DESCRIPTION_LENGTH) event.preventDefault();
  }

  function handleEditorPaste(event) {
    event.preventDefault();
    const pastedText = event.clipboardData.getData("text/plain");
    const availableCharacters = MAX_DESCRIPTION_LENGTH - descriptionText.length;
    const acceptedText = pastedText.slice(0, availableCharacters);
    document.execCommand("insertText", false, acceptedText);
  }

  function applyEditorCommand(command, value = null) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    if (!editorRef.current) return;
    setDescriptionHtml(editorRef.current.innerHTML);
    setDescriptionText(editorRef.current.innerText);
    clearFieldError("description");
  }

  function handleTagInputChange(event) {
    setTagInput(event.target.value);
    setTagsOpen(true);
    setActiveTagIndex(0);
    clearFieldError("tags");
  }

  function handleTagKeyDown(event) {
    if (event.key === "ArrowDown") { event.preventDefault(); setActiveTagIndex((curr) => Math.min(curr + 1, filteredTags.length - 1)); return; }
    if (event.key === "ArrowUp") { event.preventDefault(); setActiveTagIndex((curr) => Math.max(curr - 1, 0)); return; }
    if (event.key === "Escape") { setTagsOpen(false); return; }
    if (event.key === "Enter") {
      event.preventDefault();
      if (filteredTags.length > 0) addTag(filteredTags[activeTagIndex] ?? filteredTags[0]);
    }
  }

  function addTag(technology) {
    if (!TECHNOLOGY_OPTIONS.includes(technology)) return setErrors((curr) => ({ ...curr, tags: "Selecione uma tecnologia apresentada na lista." }));
    if (tags.includes(technology)) return setErrors((curr) => ({ ...curr, tags: "Essa tecnologia já foi adicionada." }));
    if (tags.length >= MAX_TAGS) return setErrors((curr) => ({ ...curr, tags: `Você pode adicionar no máximo ${MAX_TAGS} tecnologias.` }));

    setTags((curr) => [...curr, technology]);
    setTagInput("");
    setTagsOpen(false);
    setActiveTagIndex(0);
    clearFieldError("tags");
  }

  function removeTag(tagToRemove) {
    setTags((curr) => curr.filter((t) => t !== tagToRemove));
    clearFieldError("tags");
  }

  function addCollaborator(person) {
    setCollaborators((curr) => [...curr, { id: person.id, userId: person.id, name: person.name, profilePhotoUrl: person.profilePhotoUrl }]);
    setCollaboratorInput("");
    setCollaboratorsOpen(false);
  }

  function removeCollaborator(id) {
    setCollaborators((curr) => curr.filter((c) => c.id !== id && c.userId !== id));
  }

  // Novo fluxo de salvar rascunho no Backend
  async function handleSaveDraft() {
    if (isSavingDraft || isSubmitting) return;
    setIsSavingDraft(true);
    setFeedbackMessage("");

    try {
      const token = localStorage.getItem("techub_token") || localStorage.getItem("token");
      let media = [];
      try {
        media = await gallery.buildMediaPayload(token);
      } catch (uploadError) {
        setFeedbackType("error");
        setFeedbackMessage(uploadError.message);
        setIsSavingDraft(false);
        return;
      }

      const semesterNumber = phase ? parseInt(phase.replace(/\D/g, ""), 10) : 0;
      const payload = {
        title: title.trim(),
        // HTML do editor, limpo: a API limpa de novo antes de salvar.
        description: descriptionToSafeHtml(descriptionHtml),
        major: course || null,
        semester: isNaN(semesterNumber) ? 0 : semesterNumber,
        technologies: tags,
        collaborators: collaborators.map((c) => ({ userId: c.id || c.userId })),
        githubURL: github.trim() || null,
        liveURL: liveUrl.trim() || null,
        status: status || null,
        media,
      };

      const method = currentDraftId ? "PUT" : "POST";
      const url = currentDraftId ? `${API_URL}/projects/draft/${currentDraftId}` : `${API_URL}/projects/draft`;

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Erro ao salvar rascunho no servidor.");

      setCurrentDraftId(data.project.id);
      setSavedAt(data.project.updatedAt);
      setErrors({});
      setFeedbackType("success");
      setFeedbackMessage("Rascunho salvo no servidor! Ele não foi publicado.");
      if (!draftId) navigate(`/meus-rascunhos/${data.project.id}/editar`, { replace: true });
    } catch (error) {
      setFeedbackType("error");
      setFeedbackMessage(error.message);
    } finally {
      setIsSavingDraft(false);
    }
  }

  // Novo fluxo de submissão conectado com a rota /:id/submit
  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting || isSavingDraft) return;

    setErrors({});
    setFeedbackMessage("");
    setFeedbackType("");

    const projectData = { title, descriptionText, course, phase, tags, github, liveUrl, mediaCount: gallery.media.length };
    const validationErrors = validateForm(projectData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setFeedbackType("error");
      setFeedbackMessage("Revise os campos destacados antes de enviar o projeto.");
      document.querySelector(".is-invalid")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setIsSubmitting(true);
    let created = false;

    try {
      const token = localStorage.getItem("techub_token") || localStorage.getItem("token");
      if (gallery.hasPendingUploads) {
        setFeedbackType("");
        setFeedbackMessage("Enviando fotos e vídeos...");
      }

      let media;
      try {
        media = await gallery.buildMediaPayload(token);
      } catch (uploadError) {
        setErrors({ files: uploadError.message });
        setFeedbackType("error");
        setFeedbackMessage(uploadError.message);
        return;
      }

      setFeedbackType("");
      setFeedbackMessage("Enviando projeto...");

      const semesterNumber = phase ? parseInt(phase.replace(/\D/g, ""), 10) : 0;
      const payload = {
        title: title.trim(),
        // HTML do editor, limpo: a API limpa de novo antes de salvar.
        description: descriptionToSafeHtml(descriptionHtml),
        major: course || null,
        semester: isNaN(semesterNumber) ? 0 : semesterNumber,
        technologies: tags,
        collaborators: collaborators.map((c) => ({ userId: c.id || c.userId })),
        githubURL: github.trim() || null,
        liveURL: liveUrl.trim() || null,
        status: status || null,
        media,
      };

      const method = "POST";
      const url = currentDraftId ? `${API_URL}/projects/${currentDraftId}/submit` : `${API_URL}/projects`;

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors && Array.isArray(data.errors)) {
          const backendErrors = {};
          data.errors.forEach((issue) => {
            const field = Array.isArray(issue.path) ? issue.path[0] : issue.path;
            if (field === "description") backendErrors.description = issue.message;
            else if (field === "major") backendErrors.course = issue.message;
            else if (field === "semester") backendErrors.phase = issue.message;
            else if (field === "technologies") backendErrors.tags = issue.message;
            else if (field === "githubURL") backendErrors.github = issue.message;
            else if (field === "liveURL") backendErrors.liveUrl = issue.message;
            else if (field === "media") backendErrors.files = issue.message;
            else if (field) backendErrors[field] = issue.message;
          });
          setErrors(backendErrors);
          setFeedbackType("error");
          setFeedbackMessage("Existem inconsistências nos dados informados.");
          return;
        }
        setFeedbackType("error");
        setFeedbackMessage(data.message || "Erro ao cadastrar projeto.");
        return;
      }

      created = true;
      setFeedbackType("success");
      setFeedbackMessage("Projeto enviado para análise! Ele ficará público após a aprovação.");
      setTimeout(() => navigate("/meus-rascunhos", { state: { submitted: true } }), 1500);

    } catch (err) {
      setFeedbackType("error");
      setFeedbackMessage("Não foi possível conectar ao servidor.");
    } finally {
      if (!created) setIsSubmitting(false);
    }
  }

  if (isLoadingDraft) return <Spinner size="lg" label="Abrindo rascunho..." />;
  if (loadError) return (
    <section className="new-project-page">
      <div className="new-project-card">
        <h1 className="new-project-title">Rascunho indisponível</h1>
        <p role="alert">{loadError}</p>
        <Link className="draft-form-back" to="/meus-rascunhos">Voltar para meus rascunhos</Link>
      </div>
    </section>
  );

  return (
    <main className="new-project-page">
      <div className="draft-form-nav">
        <Link
          to="/meus-rascunhos"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '12px 15px',
            borderRadius: '9999px',
            backgroundColor: '#252525',
            border: '1px solid #85CE5A',
            textDecoration: 'none',
            fontSize: '13px',
            lineHeight: '1',
            boxSizing: 'border-box'
          }}
        >
          <span style={{ color: '#d4d4d4', fontSize: '15px', fontWeight: 500 }}>Rascunhos</span>
        </Link>
      </div>
      <h1 className="new-project-title">{isEditing ? "Editar rascunho" : "Novo projeto"}</h1>

      <form className="new-project-card" onSubmit={handleSubmit} noValidate>
        <fieldset className="draft-form-fields" disabled={isSavingDraft || isSubmitting}>

          <div className="form-field">
            <label className="form-label" htmlFor="project-title">
              Título{errors.title && <span className="required" aria-hidden="true">*</span>}
            </label>
            <input
              id="project-title" type="text" maxLength={100} value={title} onChange={handleTitleChange}
              className={errors.title ? "project-input is-invalid" : "project-input"}
              placeholder="Digite o título do projeto" aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? "title-error" : "title-counter"} required
            />
            {/* Erro e contador na mesma linha, logo abaixo do campo. */}
            <div className="field-footer">
              {errors.title && <span id="title-error" className="field-error" role="alert">{errors.title}</span>}
              <span id="title-counter" className="input-counter">{title.length}/100</span>
            </div>
          </div>

          <div className="form-field">
            <span id="description-label" className="form-label">
              Descrição do projeto{errors.description && <span className="required" aria-hidden="true">*</span>}
            </span>
            <div className={errors.description ? "description-container is-invalid" : "description-container"}>
              <div className="project-toolbar" role="toolbar" aria-label="Formatação da descrição">
                <div className="project-toolbar-group">
                  <EditorButton label="Negrito" icon="fa-bold" active={activeFormats.bold} onClick={() => applyEditorCommand("bold")} />
                  <EditorButton label="Itálico" icon="fa-italic" active={activeFormats.italic} onClick={() => applyEditorCommand("italic")} />
                  <EditorButton label="Sublinhado" icon="fa-underline" active={activeFormats.underline} onClick={() => applyEditorCommand("underline")} />
                  <EditorButton label="Tachado" icon="fa-strikethrough" active={activeFormats.strikeThrough} onClick={() => applyEditorCommand("strikeThrough")} />
                </div>
                <span className="project-toolbar-divider" aria-hidden="true" />
                <div className="project-toolbar-group">
                  <EditorButton label="Lista com marcadores" icon="fa-list-ul" active={activeFormats.unorderedList} onClick={() => applyEditorCommand("insertUnorderedList")} />
                  <EditorButton label="Lista numerada" icon="fa-list-ol" active={activeFormats.orderedList} onClick={() => applyEditorCommand("insertOrderedList")} />
                </div>
                <span className="project-toolbar-divider" aria-hidden="true" />
                <div className="project-toolbar-group">
                  <EditorButton label="Alinhar à esquerda" icon="fa-align-left" active={activeFormats.justifyLeft} onClick={() => applyEditorCommand("justifyLeft")} />
                  <EditorButton label="Centralizar" icon="fa-align-center" active={activeFormats.justifyCenter} onClick={() => applyEditorCommand("justifyCenter")} />
                  <EditorButton label="Alinhar à direita" icon="fa-align-right" active={activeFormats.justifyRight} onClick={() => applyEditorCommand("justifyRight")} />
                </div>
                <span className="project-toolbar-divider" aria-hidden="true" />
                <div className="project-toolbar-group">
                  <EditorButton label="Remover formatação" icon="fa-eraser" onClick={() => applyEditorCommand("removeFormat")} />
                  <EditorButton label="Desfazer" icon="fa-rotate-left" onClick={() => applyEditorCommand("undo")} />
                  <EditorButton label="Refazer" icon="fa-rotate-right" onClick={() => applyEditorCommand("redo")} />
                </div>
              </div>

              <div
                ref={editorRef} className="description-editor" contentEditable={!isSubmitting && !isSavingDraft}
                role="textbox" aria-multiline="true" aria-labelledby="description-label"
                aria-invalid={Boolean(errors.description)} data-placeholder="Descreva seu projeto..."
                onInput={handleEditorInput} onBeforeInput={handleEditorBeforeInput} onPaste={handleEditorPaste}
                suppressContentEditableWarning
              />
            </div>
            <div className="field-footer">
              {errors.description && <span className="field-error" role="alert">{errors.description}</span>}
              <span className="description-counter">{descriptionText.length}/{MAX_DESCRIPTION_LENGTH}</span>
            </div>
          </div>

          <div className="project-classification">
            <div className="form-field">
              <label className="form-label" htmlFor="project-course">
                Curso{errors.course && <span className="required" aria-hidden="true">*</span>}
              </label>
              <CustomSelect
                id="project-course" value={course} onChange={handleCourseChange}
                invalid={Boolean(errors.course)} ariaDescribedBy={errors.course ? "project-course-error" : undefined}
                placeholder="Selecione o curso"
                options={[
                  { value: "", label: "Selecione o curso" },
                  ...Object.keys(COURSE_PHASES).map((courseOption) => ({ value: courseOption, label: courseOption })),
                ]}
              />
              {errors.course && <span id="project-course-error" className="field-error" role="alert">{errors.course}</span>}
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="project-phase">
                Fase{errors.phase && <span className="required" aria-hidden="true">*</span>}
              </label>
              <CustomSelect
                id="project-phase" value={phase} disabled={!course}
                onChange={(event) => { setPhase(event.target.value); clearFieldError("phase"); }}
                invalid={Boolean(errors.phase)} ariaDescribedBy={errors.phase ? "project-phase-error" : undefined}
                placeholder={course ? "Selecione a fase" : "Selecione primeiro o curso"}
                options={[
                  { value: "", label: course ? "Selecione a fase" : "Selecione primeiro o curso" },
                  ...phaseOptions.map((phaseOption) => ({ value: phaseOption, label: phaseOption })),
                ]}
              />
              {errors.phase && <span className="field-error" role="alert">{errors.phase}</span>}
            </div>
          </div>

          <div className="form-field" ref={tagsContainerRef}>
            <label className="form-label" htmlFor="technology-input">
              Tecnologias{errors.tags && <span className="required" aria-hidden="true">*</span>}
            </label>
            <div className={errors.tags ? "tags-container is-invalid" : "tags-container"}>
              <div className="tags-search">
                <i className="fa-solid fa-tag toolbar-icon" aria-hidden="true" />
                <input
                  id="technology-input" type="text" placeholder="Digite para buscar tecnologias"
                  value={tagInput} onChange={handleTagInputChange} onFocus={() => setTagsOpen(true)}
                  onKeyDown={handleTagKeyDown} className="tags-input" autoComplete="off"
                  role="combobox" aria-expanded={tagsOpen} aria-controls="technology-suggestions" aria-autocomplete="list"
                />
              </div>
              {tagsOpen && (
                <ul id="technology-suggestions" className="technology-suggestions" role="listbox">
                  {filteredTags.length > 0 ? (
                    filteredTags.map((technology, index) => (
                      <li key={technology}>
                        <button
                          type="button" className={index === activeTagIndex ? "technology-suggestion is-active" : "technology-suggestion"}
                          onMouseDown={(event) => event.preventDefault()} onClick={() => addTag(technology)}
                          role="option" aria-selected={index === activeTagIndex}
                        >
                          <span>{technology}</span> <span aria-hidden="true">+</span>
                        </button>
                      </li>
                    ))
                  ) : (
                    <li className="suggestion-empty">
                      {tags.length >= MAX_TAGS ? `Limite de ${MAX_TAGS} tecnologias atingido.` : "Nenhuma tecnologia encontrada."}
                    </li>
                  )}
                </ul>
              )}
              {tags.length > 0 && (
                <div className="selected-tags">
                  {tags.map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="tag-remove-button" aria-label={`Remover ${tag}`}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <span className="field-helper">Selecione até {MAX_TAGS} tecnologias da lista.</span>
            {errors.tags && <span className="field-error" role="alert">{errors.tags}</span>}
          </div>

          <div className="form-field" ref={collaboratorContainerRef}>
            <label className="form-label" htmlFor="collaborator-input">Colaboradores</label>
            <div className="tags-container">
              <div className="tags-search">
                <i className="fa-solid fa-users toolbar-icon" aria-hidden="true" />
                <input
                  id="collaborator-input" type="text" placeholder="Pesquisar colaborador"
                  value={collaboratorInput}
                  onChange={(event) => { setCollaboratorInput(event.target.value); setCollaboratorsOpen(true); }}
                  onFocus={() => setCollaboratorsOpen(true)} className="tags-input" autoComplete="off"
                />
              </div>
              {collaboratorsOpen && collaboratorInput.trim().length >= 2 && (
                <ul className="collaborator-suggestions">
                  {collaboratorSearchStatus === "searching" ? (
                    <li className="collaborator-empty">Pesquisando colaboradores...</li>
                  ) : collaboratorSearchStatus === "error" ? (
                    <li className="collaborator-empty">Não foi possível buscar colaboradores. Tente novamente.</li>
                  ) : collaboratorSuggestions.length > 0 ? (
                    collaboratorSuggestions.map((person) => (
                      <li key={person.id}>
                        <button
                          type="button" className="collaborator-suggestion" onMouseDown={(event) => event.preventDefault()}
                          onClick={() => addCollaborator(person)}
                        >
                          <CollaboratorAvatar name={person.name} profilePhotoUrl={person.profilePhotoUrl} compact />
                          {person.name}
                        </button>
                      </li>
                    ))
                  ) : (
                    <li className="collaborator-empty">Nenhum colaborador encontrado.</li>
                  )}
                </ul>
              )}
              {collaborators.length > 0 && (
                <div className="collaborators-grid">
                  {collaborators.map((collaborator) => (
                    <div key={collaborator.id || collaborator.userId} className="collaborator-card">
                      <button
                        type="button" onClick={() => removeCollaborator(collaborator.id || collaborator.userId)}
                        className="collaborator-remove-button" aria-label={`Remover ${collaborator.name}`}
                      >×</button>
                      <CollaboratorAvatar name={collaborator.name} profilePhotoUrl={collaborator.profilePhotoUrl} />
                      <span className="collaborator-name">{collaborator.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <ul className="collaborator-rules">
              {COLLABORATOR_RULES.map((rule) => <li key={rule}>{rule}</li>)}
            </ul>
          </div>

          <div className="external-links">
            <div className="form-field">
              <label className="form-label" htmlFor="github-url">Repositório no GitHub</label>
              <div className="external-link-field">
                <GithubIcon />
                <input
                  id="github-url" type="url" placeholder="https://github.com/usuario/repositorio"
                  value={github} onChange={(event) => { setGithub(event.target.value); clearFieldError("github"); }}
                  className={errors.github ? "project-input is-invalid" : "project-input"}
                  aria-invalid={Boolean(errors.github)}
                />
              </div>
              {errors.github && <span className="field-error" role="alert">{errors.github}</span>}
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="live-url">Link para demonstração</label>
              <div className="external-link-field">
                <ExternalLinkIcon />
                <input
                  id="live-url" type="url" placeholder="https://meu-projeto.com" value={liveUrl}
                  onChange={(event) => { setLiveUrl(event.target.value); clearFieldError("liveUrl"); }}
                  className={errors.liveUrl ? "project-input is-invalid" : "project-input"}
                  aria-invalid={Boolean(errors.liveUrl)}
                />
              </div>
              {errors.liveUrl && <span className="field-error" role="alert">{errors.liveUrl}</span>}
            </div>
          </div>

          <ProjectGallery gallery={gallery} error={errors.files} onInputChange={() => clearFieldError("files")} />

          <fieldset className="status-section">
            <legend className="form-label">Status</legend>
            <div className="status-options">
              {STATUS_OPTIONS.map((option) => {
                const active = status === option;
                return (
                  <button
                    type="button" key={option} onClick={() => setStatus(option)}
                    className={`status-button ${active ? "active" : ""}`} aria-pressed={active}
                  >
                    <span className="status-radio">{active && <span className="status-radio-inner" />}</span>
                    {option}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {feedbackMessage && (
            <p className={`form-feedback ${feedbackType}`} role={feedbackType === "error" ? "alert" : "status"}>
              {feedbackMessage}
            </p>
          )}
        </fieldset>

        <div className="actions">
          <button type="button" onClick={handleSaveDraft} className="action-button save-draft" disabled={isSavingDraft || isSubmitting}>
            {isSavingDraft ? "Salvando..." : "Salvar rascunho"}
          </button>
          <button type="submit" className="action-button submit-review" disabled={isSubmitting || isSavingDraft}>
            {isSubmitting ? "Enviando..." : "Enviar para a revisão"}
          </button>
        </div>
      </form>
    </main>
  );
}

function EditorButton({ label, icon, onClick, active }) {
  const hasActiveState = typeof active === "boolean";
  return (
    <button
      type="button" className={`project-toolbar-button ${active ? "is-active" : ""}`}
      data-tooltip={label} aria-label={label} aria-pressed={hasActiveState ? active : undefined}
      title={label} onMouseDown={(event) => event.preventDefault()} onClick={onClick}
    >
      <i className={`fa-solid ${icon}`} aria-hidden="true" />
    </button>
  );
}

function moveCursorToEnd(element) {
  const range = document.createRange();
  const selection = window.getSelection();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function GithubIcon() {
  return (
    <svg className="external-icon github-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.483 0-.237-.009-.868-.013-1.703-2.782.605-3.369-1.34-3.369-1.34-.454-1.154-1.11-1.461-1.11-1.461-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836a9.59 9.59 0 012.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg className="external-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M15 3h6v6M10 14 21 3" />
    </svg>
  );
}