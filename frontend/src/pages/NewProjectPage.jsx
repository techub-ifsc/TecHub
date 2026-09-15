import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import "./NewProjectPage.css";

const MAX_DESCRIPTION_LENGTH = 3000;
const MAX_TAGS = 8;
const MAX_FILES = 10;
const MAX_FILE_SIZE = 20 * 1024 * 1024;

const COURSE_PHASES = {
  "Ciência da Computação": 8,
  "Técnico em Informática para Internet": 4,
  "Técnico em Desenvolvimento de Sistemas": 3,
};

const TECHNOLOGY_OPTIONS = [
  "Adobe XD",
  "Android",
  "Angular",
  "Arduino",
  "ASP.NET",
  "AWS",
  "Azure",
  "Back-end",
  "Bootstrap",
  "C",
  "C#",
  "C++",
  "CI/CD",
  "Cloud Computing",
  "CSS",
  "Dart",
  "Data Science",
  "Django",
  "Docker",
  "Express",
  "Figma",
  "Firebase",
  "Flask",
  "Flutter",
  "Front-end",
  "Full Stack",
  "Git",
  "GitHub",
  "GitLab",
  "Go",
  "Google Cloud",
  "GraphQL",
  "HTML",
  "Inteligência Artificial",
  "Ionic",
  "Java",
  "JavaScript",
  "Jest",
  "Kotlin",
  "Kubernetes",
  "Laravel",
  "Linux",
  "Machine Learning",
  "MariaDB",
  "Material UI",
  "Mobile",
  "MongoDB",
  "MySQL",
  "NestJS",
  "Next.js",
  "Node.js",
  "NoSQL",
  "Nuxt.js",
  "Oracle",
  "PHP",
  "PostgreSQL",
  "Python",
  "React",
  "React Native",
  "Redis",
  "REST API",
  "Ruby",
  "Rust",
  "Sass",
  "Spring Boot",
  "SQL",
  "SQLite",
  "Svelte",
  "Swift",
  "Tailwind CSS",
  "TypeScript",
  "Unity",
  "Unreal Engine",
  "UX/UI",
  "Vue.js",
  "Web",
  "WebSocket",
  "WordPress",
];

const MOCK_COLLABORATORS = [
  { id: 1, name: "Antoni Ferraz", color: "#3a5a8a" },
  { id: 2, name: "Gabriela Rodrigues", color: "#8a3a5a" },
  { id: 3, name: "Marcio Zunique", color: "#555555" },
  { id: 4, name: "Lucas Mendes", color: "#4a7a5a" },
];

const STATUS_OPTIONS = [
  "Em design",
  "Em desenvolvimento",
  "Concluído",
  "Pausado",
];

const COLLABORATOR_RULES = [
  "O rascunho salvo fica visível para você e os colaboradores.",
  "Os colaboradores também podem editar o projeto.",
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

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function validateForm({
  title,
  descriptionText,
  course,
  phase,
  tags,
  github,
  liveUrl,
  files,
}) {
  const errors = {};

  if (!title.trim()) {
    errors.title = "O título é obrigatório.";
  } else if (title.trim().length < 3) {
    errors.title = "Informe pelo menos 3 caracteres.";
  }

  if (!descriptionText.trim()) {
    errors.description = "Descreva o projeto antes de enviar.";
  } else if (descriptionText.trim().length < 20) {
    errors.description = "A descrição deve possuir pelo menos 20 caracteres.";
  }

  if (!course) {
    errors.course = "Selecione o curso relacionado ao projeto.";
  }

  if (!phase) {
    errors.phase = "Selecione a fase relacionada ao projeto.";
  }

  if (tags.length === 0) {
    errors.tags = "Adicione pelo menos uma tecnologia.";
  }

  if (github.trim() && !isValidUrl(github.trim())) {
    errors.github =
      "Informe uma URL válida, começando com http:// ou https://.";
  }

  if (liveUrl.trim() && !isValidUrl(liveUrl.trim())) {
    errors.liveUrl =
      "Informe uma URL válida, começando com http:// ou https://.";
  }

  if (files.length === 0) {
    errors.files = "Adicione pelo menos uma imagem ou vídeo do projeto.";
  }

  return errors;
}

export default function NewProjectPage() {
  const navigate = useNavigate();

  const editorRef = useRef(null);
  const tagsContainerRef = useRef(null);
  const collaboratorContainerRef = useRef(null);

  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
    unorderedList: false,
    orderedList: false,
    justifyLeft: false,
    justifyCenter: false,
    justifyRight: false,
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
  const [collaboratorsOpen, setCollaboratorsOpen] = useState(false);

  const [github, setGithub] = useState("");
  const [liveUrl, setLiveUrl] = useState("");

  const [status, setStatus] = useState("Em design");

  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);

  const [errors, setErrors] = useState({});
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackType, setFeedbackType] = useState("");

  const phaseOptions = course
    ? Array.from(
        { length: COURSE_PHASES[course] },
        (_, index) => `${index + 1}ª Fase`,
      )
    : [];

  const filteredTags = useMemo(() => {
    const search = tagInput.trim().toLowerCase();

    return TECHNOLOGY_OPTIONS.filter((technology) => {
      const matchesSearch = technology.toLowerCase().includes(search);

      const isNotSelected = !tags.includes(technology);

      return matchesSearch && isNotSelected;
    }).slice(0, 10);
  }, [tagInput, tags]);

  const collaboratorSuggestions = useMemo(() => {
    const search = collaboratorInput.trim().toLowerCase();

    if (!search) {
      return [];
    }

    return MOCK_COLLABORATORS.filter((person) => {
      const matchesSearch = person.name.toLowerCase().includes(search);

      const isNotSelected = !collaborators.some(
        (collaborator) => collaborator.id === person.id,
      );

      return matchesSearch && isNotSelected;
    });
  }, [collaboratorInput, collaborators]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        tagsContainerRef.current &&
        !tagsContainerRef.current.contains(event.target)
      ) {
        setTagsOpen(false);
      }

      if (
        collaboratorContainerRef.current &&
        !collaboratorContainerRef.current.contains(event.target)
      ) {
        setCollaboratorsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    function handleSelectionChange() {
      const editor = editorRef.current;
      const selection = window.getSelection();

      if (
        !editor ||
        !selection ||
        !selection.anchorNode ||
        !editor.contains(selection.anchorNode)
      ) {
        return;
      }

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

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, []);

  function clearFieldError(field) {
    setErrors((currentErrors) => ({
      ...currentErrors,
      [field]: "",
    }));

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

    if (isInsertion && descriptionText.length >= MAX_DESCRIPTION_LENGTH) {
      event.preventDefault();
    }
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
  updateEditorState();

  setActiveFormats({
    bold: document.queryCommandState("bold"),
    italic: document.queryCommandState("italic"),
    underline: document.queryCommandState("underline"),
    strikeThrough:
      document.queryCommandState("strikeThrough"),
    unorderedList:
      document.queryCommandState("insertUnorderedList"),
    orderedList:
      document.queryCommandState("insertOrderedList"),
    justifyLeft:
      document.queryCommandState("justifyLeft"),
    justifyCenter:
      document.queryCommandState("justifyCenter"),
    justifyRight:
      document.queryCommandState("justifyRight"),
  });
}

  function updateEditorState() {
    if (!editorRef.current) {
      return;
    }

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
    if (event.key === "ArrowDown") {
      event.preventDefault();

      setActiveTagIndex((currentIndex) =>
        Math.min(currentIndex + 1, filteredTags.length - 1),
      );

      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      setActiveTagIndex((currentIndex) => Math.max(currentIndex - 1, 0));

      return;
    }

    if (event.key === "Escape") {
      setTagsOpen(false);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      if (filteredTags.length > 0) {
        addTag(filteredTags[activeTagIndex] ?? filteredTags[0]);
      }
    }
  }

  function addTag(technology) {
    if (!TECHNOLOGY_OPTIONS.includes(technology)) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        tags: "Selecione uma tecnologia apresentada na lista.",
      }));

      return;
    }

    if (tags.includes(technology)) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        tags: "Essa tecnologia já foi adicionada.",
      }));

      return;
    }

    if (tags.length >= MAX_TAGS) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        tags: `Você pode adicionar no máximo ${MAX_TAGS} tecnologias.`,
      }));

      return;
    }

    setTags((currentTags) => [...currentTags, technology]);
    setTagInput("");
    setTagsOpen(false);
    setActiveTagIndex(0);
    clearFieldError("tags");
  }

  function removeTag(tagToRemove) {
    setTags((currentTags) => currentTags.filter((tag) => tag !== tagToRemove));

    setTagInput("");
    clearFieldError("tags");
  }

  function addCollaborator(person) {
    setCollaborators((currentCollaborators) => [
      ...currentCollaborators,
      person,
    ]);

    setCollaboratorInput("");
    setCollaboratorsOpen(false);
  }

  function removeCollaborator(id) {
    setCollaborators((currentCollaborators) =>
      currentCollaborators.filter((collaborator) => collaborator.id !== id),
    );
  }

  function addFiles(fileList) {
    const incomingFiles = Array.from(fileList);
    const acceptedFiles = [];
    const rejectedMessages = [];

    for (const file of incomingFiles) {
      const isAcceptedType =
        file.type.startsWith("image/") || file.type.startsWith("video/");

      if (!isAcceptedType) {
        rejectedMessages.push(`${file.name}: formato não permitido.`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        rejectedMessages.push(`${file.name}: tamanho superior a 20 MB.`);
        continue;
      }

      const isDuplicate = [...files, ...acceptedFiles].some(
        (savedFile) =>
          savedFile.name === file.name && savedFile.size === file.size,
      );

      if (isDuplicate) {
        rejectedMessages.push(`${file.name}: arquivo já adicionado.`);
        continue;
      }

      if (files.length + acceptedFiles.length >= MAX_FILES) {
        rejectedMessages.push(`O limite é de ${MAX_FILES} arquivos.`);
        break;
      }

      acceptedFiles.push(file);
    }

    if (acceptedFiles.length > 0) {
      setFiles((currentFiles) => [...currentFiles, ...acceptedFiles]);

      clearFieldError("files");
    }

    if (rejectedMessages.length > 0) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        files: rejectedMessages.join(" "),
      }));
    }
  }

  function removeFile(position) {
    setFiles((currentFiles) =>
      currentFiles.filter((_, index) => index !== position),
    );
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragOver(false);
    addFiles(event.dataTransfer.files);
  }

  function getProjectData() {
    return {
      title: title.trim(),
      description: descriptionHtml,
      descriptionText: descriptionText.trim(),
      course,
      phase,
      tags,
      collaborators: collaborators.map(({ id, name }) => ({
        id,
        name,
      })),
      github: github.trim(),
      liveUrl: liveUrl.trim(),
      status,
      files,
    };
  }

  function handleSaveDraft() {
    const draft = getProjectData();

    const storableDraft = {
      ...draft,
      files: files.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
      })),
      savedAt: new Date().toISOString(),
    };

    localStorage.setItem(
      "techub:new-project-draft",
      JSON.stringify(storableDraft),
    );

    setFeedbackType("success");
    setFeedbackMessage("Rascunho salvo neste navegador.");
  }

  function handleSubmit(event) {
    event.preventDefault();

    const projectData = getProjectData();
    const validationErrors = validateForm(projectData);

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setFeedbackType("error");
      setFeedbackMessage(
        "Revise os campos destacados antes de enviar o projeto.",
      );

      const firstInvalidField = document.querySelector(".field-error");

      firstInvalidField?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      return;
    }

    setFeedbackType("success");
    setFeedbackMessage(
      "Projeto validado com sucesso! A integração com o backend será realizada na próxima etapa.",
    );

    console.log("Projeto pronto para envio:", projectData);
  }

  return (
    <main className="new-project-page">
      <h1 className="new-project-title">Novo projeto</h1>

      <form className="new-project-card" onSubmit={handleSubmit} noValidate>
        <div className="form-field">
          <label className="form-label" htmlFor="project-title">
            Título
            <span className="required" aria-hidden="true">
              *
            </span>
          </label>

          <input
            id="project-title"
            type="text"
            maxLength={100}
            value={title}
            onChange={handleTitleChange}
            className={
              errors.title ? "project-input is-invalid" : "project-input"
            }
            placeholder="Digite o título do projeto"
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? "title-error" : "title-counter"}
            required
          />

          <span id="title-counter" className="input-counter">
            {title.length}/100
          </span>

          {errors.title && (
            <span id="title-error" className="field-error" role="alert">
              {errors.title}
            </span>
          )}
        </div>

        <div className="form-field">
          <span id="description-label" className="form-label">
            Descrição do projeto
            <span className="required" aria-hidden="true">
              *
            </span>
          </span>

          <div
            className={
              errors.description
                ? "description-container is-invalid"
                : "description-container"
            }
          >
<div
  className="project-toolbar"
  role="toolbar"
  aria-label="Formatação da descrição"
>
  <div className="project-toolbar-group">
    <EditorButton
      label="Negrito"
      icon="fa-bold"
      active={activeFormats.bold}
      onClick={() => applyEditorCommand("bold")}
    />

    <EditorButton
      label="Itálico"
      icon="fa-italic"
      active={activeFormats.italic}
      onClick={() => applyEditorCommand("italic")}
    />

    <EditorButton
      label="Sublinhado"
      icon="fa-underline"
      active={activeFormats.underline}
      onClick={() => applyEditorCommand("underline")}
    />

    <EditorButton
      label="Tachado"
      icon="fa-strikethrough"
      active={activeFormats.strikeThrough}
      onClick={() => applyEditorCommand("strikeThrough")}
    />
  </div>

  <span className="project-toolbar-divider" aria-hidden="true" />

  <div className="project-toolbar-group">
    <EditorButton
      label="Lista com marcadores"
      icon="fa-list-ul"
      active={activeFormats.unorderedList}
      onClick={() =>
        applyEditorCommand("insertUnorderedList")
      }
    />

    <EditorButton
      label="Lista numerada"
      icon="fa-list-ol"
      active={activeFormats.orderedList}
      onClick={() =>
        applyEditorCommand("insertOrderedList")
      }
    />
  </div>

  <span className="project-toolbar-divider" aria-hidden="true" />

  <div className="project-toolbar-group">
    <EditorButton
      label="Alinhar à esquerda"
      icon="fa-align-left"
      active={activeFormats.justifyLeft}
      onClick={() => applyEditorCommand("justifyLeft")}
    />

    <EditorButton
      label="Centralizar"
      icon="fa-align-center"
      active={activeFormats.justifyCenter}
      onClick={() => applyEditorCommand("justifyCenter")}
    />

    <EditorButton
      label="Alinhar à direita"
      icon="fa-align-right"
      active={activeFormats.justifyRight}
      onClick={() => applyEditorCommand("justifyRight")}
    />
  </div>

  <span className="project-toolbar-divider" aria-hidden="true" />

  <div className="project-toolbar-group">
    <EditorButton
      label="Remover formatação"
      icon="fa-eraser"
      onClick={() => applyEditorCommand("removeFormat")}
    />

    <EditorButton
      label="Desfazer"
      icon="fa-rotate-left"
      onClick={() => applyEditorCommand("undo")}
    />

    <EditorButton
      label="Refazer"
      icon="fa-rotate-right"
      onClick={() => applyEditorCommand("redo")}
    />
  </div>
</div>

            <div
              ref={editorRef}
              className="description-editor"
              contentEditable
              role="textbox"
              aria-multiline="true"
              aria-labelledby="description-label"
              aria-invalid={Boolean(errors.description)}
              data-placeholder="Descreva seu projeto..."
              onInput={handleEditorInput}
              onBeforeInput={handleEditorBeforeInput}
              onPaste={handleEditorPaste}
              suppressContentEditableWarning
            />
          </div>

          <span className="description-counter">
            {descriptionText.length}/{MAX_DESCRIPTION_LENGTH}
          </span>

          {errors.description && (
            <span className="field-error" role="alert">
              {errors.description}
            </span>
          )}
        </div>

        <div className="project-classification">
          <div className="form-field">
            <label className="form-label" htmlFor="project-course">
              Curso
              <span className="required" aria-hidden="true">
                *
              </span>
            </label>

            <select
              id="project-course"
              className={
                errors.course ? "project-select is-invalid" : "project-select"
              }
              value={course}
              onChange={handleCourseChange}
              aria-invalid={Boolean(errors.course)}
              required
            >
              <option value="">Selecione o curso</option>

              {Object.keys(COURSE_PHASES).map((courseOption) => (
                <option key={courseOption} value={courseOption}>
                  {courseOption}
                </option>
              ))}
            </select>

            {errors.course && (
              <span className="field-error" role="alert">
                {errors.course}
              </span>
            )}
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="project-phase">
              Fase
              <span className="required" aria-hidden="true">
                *
              </span>
            </label>

            <select
              id="project-phase"
              className={
                errors.phase ? "project-select is-invalid" : "project-select"
              }
              value={phase}
              onChange={(event) => {
                setPhase(event.target.value);
                clearFieldError("phase");
              }}
              disabled={!course}
              aria-invalid={Boolean(errors.phase)}
              required
            >
              <option value="">
                {course ? "Selecione a fase" : "Selecione primeiro o curso"}
              </option>

              {phaseOptions.map((phaseOption) => (
                <option key={phaseOption} value={phaseOption}>
                  {phaseOption}
                </option>
              ))}
            </select>

            {errors.phase && (
              <span className="field-error" role="alert">
                {errors.phase}
              </span>
            )}
          </div>
        </div>

        <div className="form-field" ref={tagsContainerRef}>
          <label className="form-label" htmlFor="technology-input">
            Tecnologias
            <span className="required" aria-hidden="true">
              *
            </span>
          </label>

          <div
            className={
              errors.tags ? "tags-container is-invalid" : "tags-container"
            }
          >
            <div className="tags-search">
              <i className="fa-solid fa-tag toolbar-icon" aria-hidden="true" />

              <input
                id="technology-input"
                type="text"
                placeholder="Digite para buscar tecnologias"
                value={tagInput}
                onChange={handleTagInputChange}
                onFocus={() => setTagsOpen(true)}
                onKeyDown={handleTagKeyDown}
                className="tags-input"
                autoComplete="off"
                role="combobox"
                aria-expanded={tagsOpen}
                aria-controls="technology-suggestions"
                aria-autocomplete="list"
              />
            </div>

            {tagsOpen && (
              <ul
                id="technology-suggestions"
                className="technology-suggestions"
                role="listbox"
              >
                {filteredTags.length > 0 ? (
                  filteredTags.map((technology, index) => (
                    <li key={technology}>
                      <button
                        type="button"
                        className={
                          index === activeTagIndex
                            ? "technology-suggestion is-active"
                            : "technology-suggestion"
                        }
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => addTag(technology)}
                        role="option"
                        aria-selected={index === activeTagIndex}
                      >
                        <span>{technology}</span>
                        <span aria-hidden="true">+</span>
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="suggestion-empty">
                    {tags.length >= MAX_TAGS
                      ? `Limite de ${MAX_TAGS} tecnologias atingido.`
                      : "Nenhuma tecnologia encontrada."}
                  </li>
                )}
              </ul>
            )}

            {tags.length > 0 && (
              <div className="selected-tags">
                {tags.map((tag) => (
                  <span key={tag} className="tag">
                    {tag}

                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="tag-remove-button"
                      aria-label={`Remover ${tag}`}
                      title={`Remover ${tag}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <span className="field-helper">
            Selecione até {MAX_TAGS} tecnologias da lista.
          </span>

          {errors.tags && (
            <span className="field-error" role="alert">
              {errors.tags}
            </span>
          )}
        </div>

        <div className="form-field" ref={collaboratorContainerRef}>
          <label className="form-label" htmlFor="collaborator-input">
            Colaboradores
          </label>

          <div className="tags-container">
            <div className="tags-search">
              <i
                className="fa-solid fa-users toolbar-icon"
                aria-hidden="true"
              />

              <input
                id="collaborator-input"
                type="text"
                placeholder="Pesquisar colaborador"
                value={collaboratorInput}
                onChange={(event) => {
                  setCollaboratorInput(event.target.value);
                  setCollaboratorsOpen(true);
                }}
                onFocus={() => setCollaboratorsOpen(true)}
                className="tags-input"
                autoComplete="off"
              />
            </div>

            {collaboratorsOpen && collaboratorInput.trim() && (
              <ul className="collaborator-suggestions">
                {collaboratorSuggestions.length > 0 ? (
                  collaboratorSuggestions.map((person) => (
                    <li key={person.id}>
                      <button
                        type="button"
                        className="collaborator-suggestion"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => addCollaborator(person)}
                      >
                        <span
                          className="collaborator-suggestion-avatar"
                          style={{
                            backgroundColor: person.color,
                          }}
                        >
                          {person.name.charAt(0)}
                        </span>

                        {person.name}
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="collaborator-empty">
                    Nenhum colaborador encontrado.
                  </li>
                )}
              </ul>
            )}

            {collaborators.length > 0 && (
              <div className="collaborators-grid">
                {collaborators.map((collaborator) => (
                  <div key={collaborator.id} className="collaborator-card">
                    <button
                      type="button"
                      onClick={() => removeCollaborator(collaborator.id)}
                      className="collaborator-remove-button"
                      aria-label={`Remover ${collaborator.name}`}
                      title={`Remover ${collaborator.name}`}
                    >
                      ×
                    </button>

                    <div
                      className="collaborator-avatar"
                      style={{
                        backgroundColor: collaborator.color,
                      }}
                    >
                      {collaborator.name.charAt(0)}
                    </div>

                    <span className="collaborator-name">
                      {collaborator.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <ul className="collaborator-rules">
            {COLLABORATOR_RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>

        <div className="external-links">
          <div className="form-field">
            <label className="form-label" htmlFor="github-url">
              Repositório no GitHub
            </label>

            <div className="external-link-field">
              <GithubIcon />

              <input
                id="github-url"
                type="url"
                placeholder="https://github.com/usuario/repositorio"
                value={github}
                onChange={(event) => {
                  setGithub(event.target.value);
                  clearFieldError("github");
                }}
                className={
                  errors.github ? "project-input is-invalid" : "project-input"
                }
                aria-invalid={Boolean(errors.github)}
              />
            </div>

            {errors.github && (
              <span className="field-error" role="alert">
                {errors.github}
              </span>
            )}
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="live-url">
              Link para demonstração
            </label>

            <div className="external-link-field">
              <ExternalLinkIcon />

              <input
                id="live-url"
                type="url"
                placeholder="https://meu-projeto.com"
                value={liveUrl}
                onChange={(event) => {
                  setLiveUrl(event.target.value);
                  clearFieldError("liveUrl");
                }}
                className={
                  errors.liveUrl ? "project-input is-invalid" : "project-input"
                }
                aria-invalid={Boolean(errors.liveUrl)}
              />
            </div>

            {errors.liveUrl && (
              <span className="field-error" role="alert">
                {errors.liveUrl}
              </span>
            )}
          </div>
        </div>

        <div className="form-field">
          <span className="form-label">
            Galeria do projeto
            <span className="required" aria-hidden="true">
              *
            </span>
          </span>

          <label
            className={`upload-area ${
              dragOver ? "drag-over" : ""
            } ${errors.files ? "is-invalid" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              className="upload-input"
              onChange={(event) => {
                addFiles(event.target.files);
                event.target.value = "";
              }}
            />

            <i className="fa-solid fa-plus upload-icon" aria-hidden="true" />

            <div className="upload-text">
              <p className="upload-title">Adicionar fotos ou vídeos</p>

              <p className="upload-helper">
                Até {MAX_FILES} arquivos de no máximo 20 MB cada
              </p>
            </div>
          </label>

          {errors.files && (
            <span className="field-error" role="alert">
              {errors.files}
            </span>
          )}

          {files.length > 0 && (
            <ul className="upload-file-list">
              {files.map((file, index) => (
                <li key={`${file.name}-${file.size}`} className="upload-file">
                  <i className="fa-solid fa-paperclip" aria-hidden="true" />

                  <span className="upload-file-information">
                    <strong>{file.name}</strong>
                    <small>{formatFileSize(file.size)}</small>
                  </span>

                  <button
                    type="button"
                    className="upload-file-remove"
                    onClick={() => removeFile(index)}
                    aria-label={`Remover ${file.name}`}
                    title={`Remover ${file.name}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <fieldset className="status-section">
          <legend className="form-label">Status</legend>

          <div className="status-options">
            {STATUS_OPTIONS.map((option) => {
              const active = status === option;

              return (
                <button
                  type="button"
                  key={option}
                  onClick={() => setStatus(option)}
                  className={`status-button ${active ? "active" : ""}`}
                  aria-pressed={active}
                >
                  <span className="status-radio">
                    {active && <span className="status-radio-inner" />}
                  </span>

                  {option}
                </button>
              );
            })}
          </div>
        </fieldset>

        {feedbackMessage && (
          <p
            className={`form-feedback ${feedbackType}`}
            role={feedbackType === "error" ? "alert" : "status"}
          >
            {feedbackMessage}
          </p>
        )}

        <div className="actions">
          <button
            type="button"
            onClick={handleSaveDraft}
            className="action-button save-draft"
          >
            Salvar rascunho
          </button>

          <button type="submit" className="action-button submit-review">
            Enviar para revisão
          </button>
        </div>

        <button
          type="button"
          className="cancel-project-button"
          onClick={() => navigate("/")}
        >
          Cancelar e voltar para a página inicial
        </button>
      </form>
    </main>
  );
}

function EditorButton({
  label,
  icon,
  onClick,
  active,
}) {
  const hasActiveState = typeof active === "boolean";

  return (
    <button
      type="button"
      className={`project-toolbar-button ${
        active ? "is-active" : ""
      }`}
      data-tooltip={label}
      aria-label={label}
      aria-pressed={hasActiveState ? active : undefined}
      title={label}
      onMouseDown={(event) => {
        event.preventDefault();
      }}
      onClick={onClick}
    >
      <i
        className={`fa-solid ${icon}`}
        aria-hidden="true"
      />
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
    <svg
      className="external-icon github-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.483 0-.237-.009-.868-.013-1.703-2.782.605-3.369-1.34-3.369-1.34-.454-1.154-1.11-1.461-1.11-1.461-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836a9.59 9.59 0 012.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"
      />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      className="external-icon"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M15 3h6v6M10 14 21 3" />
    </svg>
  );
}
