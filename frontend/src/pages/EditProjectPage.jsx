import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { API_URL } from "../api/apiUrl";
import CollaboratorAvatar from "../components/CollaboratorAvatar";
import ProjectGallery from "../components/ProjectGallery";
import { useProjectMedia } from "../hooks/useProjectMedia";
import "./NewProjectPage.css";

const MAX_DESCRIPTION_LENGTH = 3000;
const MAX_TAGS = 8;

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

function validateForm({
  title,
  descriptionText,
  course,
  phase,
  tags,
  github,
  liveUrl,
  mediaCount,
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
    errors.github = "Informe uma URL válida, começando com http:// ou https://.";
  }

  if (liveUrl.trim() && !isValidUrl(liveUrl.trim())) {
    errors.liveUrl = "Informe uma URL válida, começando com http:// ou https://.";
  }

  if (mediaCount === 0) {
    errors.files = "Adicione pelo menos uma imagem, vídeo ou link do YouTube.";
  }

  return errors;
}

export default function EditProjectPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const editorRef = useRef(null);
  const tagsContainerRef = useRef(null);
  const collaboratorContainerRef = useRef(null);
  const initialCollaboratorsRef = useRef([]);

  const [isLoading, setIsLoading] = useState(true);

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
  const [collaboratorOptions, setCollaboratorOptions] = useState([]);
  const [collaboratorsOpen, setCollaboratorsOpen] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  const [github, setGithub] = useState("");
  const [liveUrl, setLiveUrl] = useState("");
  const [status, setStatus] = useState("Em desenvolvimento");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errors, setErrors] = useState({});
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackType, setFeedbackType] = useState("");

  const gallery = useProjectMedia({
    onError: (message) =>
      message
        ? setErrors((curr) => ({ ...curr, files: message }))
        : clearFieldError("files"),
  });

  // Carrega os dados existentes do projeto
  useEffect(() => {
    async function loadProjectDetails() {
      try {
        setIsLoading(true);
        const response = await fetch(`${API_URL}/projects/${id}`);

        if (response.status === 404) {
          setFeedbackType("error");
          setFeedbackMessage("Projeto não encontrado.");
          return;
        }

        if (!response.ok) {
          throw new Error("Erro ao buscar projeto");
        }

        const data = await response.json();
        const currentProject = data.project;

        if (!currentProject) {
          setFeedbackType("error");
          setFeedbackMessage("Projeto não encontrado.");
          return;
        }

        let storedUser = null;
        try {
          storedUser = JSON.parse(
            localStorage.getItem("techub_user") || "null"
          );
        } catch {
          storedUser = null;
        }

        const projectOwnerId =
          currentProject.ownerId || currentProject.owner_id;
        const owner = storedUser?.id === projectOwnerId;
        const collaborator = currentProject.collaborators?.some(
          (item) => item.userId === storedUser?.id || item.id === storedUser?.id
        );

        setIsOwner(Boolean(owner));
        setCanEdit(Boolean(owner || collaborator));

        // Popula os campos do formulário
        setTitle(currentProject.title || "");

        const initialDesc = currentProject.description || "";
        setDescriptionHtml(initialDesc);
        setDescriptionText(initialDesc);

        if (editorRef.current) {
          editorRef.current.innerHTML = initialDesc;
        }

        if (currentProject.major) {
          setCourse(currentProject.major);
        }

        if (currentProject.semester) {
          setPhase(`${currentProject.semester}ª Fase`);
        }

        if (Array.isArray(currentProject.technologies)) {
          setTags(currentProject.technologies);
        }

        if (Array.isArray(currentProject.collaborators)) {
          const mappedCollabs = currentProject.collaborators.map((c) => ({
            id: c.userId || c.id,
            name: c.name || "Colaborador",
            profilePhotoUrl: c.profilePhotoUrl || null,
            contribution: c.contribution || null,
          }));
          initialCollaboratorsRef.current = mappedCollabs.map(
            ({ id: collabId, contribution }) => ({ id: collabId, contribution })
          );
          setCollaborators(mappedCollabs);
        }

        setGithub(
          currentProject.githubURL || currentProject.github_url || ""
        );
        setLiveUrl(currentProject.liveURL || currentProject.live_url || "");
        setStatus(currentProject.status || "Em desenvolvimento");

        // Carrega mídias já existentes no hook unificado de galeria
        gallery.loadSavedMedia(currentProject.media || []);
      } catch (err) {
        console.error("Falha ao carregar projeto para edição:", err);
        setFeedbackType("error");
        setFeedbackMessage("Não foi possível carregar os dados do projeto.");
      } finally {
        setIsLoading(false);
      }
    }

    if (id) {
      loadProjectDetails();
    }
  }, [id]);

  // Atualiza o editor caso os dados cheguem após o mount inicial
  useEffect(() => {
    if (editorRef.current && descriptionHtml && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = descriptionHtml;
    }
  }, [descriptionHtml]);

  const phaseOptions = course
    ? Array.from(
        { length: COURSE_PHASES[course] },
        (_, index) => `${index + 1}ª Fase`
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

  useEffect(() => {
    const query = collaboratorInput.trim();
    if (!isOwner || query.length < 2) {
      setCollaboratorOptions([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const token =
          localStorage.getItem("techub_token") ||
          localStorage.getItem("token");
        const response = await fetch(
          `${API_URL}/projects/collaborators/search?q=${encodeURIComponent(
            query
          )}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            signal: controller.signal,
          }
        );
        if (!response.ok) throw new Error("Falha ao pesquisar colaboradores");
        const data = await response.json();
        setCollaboratorOptions(data.users || []);
      } catch (error) {
        if (error.name !== "AbortError") setCollaboratorOptions([]);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [collaboratorInput, isOwner]);

  const collaboratorSuggestions = useMemo(() => {
    return collaboratorOptions.filter((person) => {
      const isNotSelected = !collaborators.some(
        (collaborator) => collaborator.id === person.id
      );
      return isNotSelected;
    });
  }, [collaboratorOptions, collaborators]);

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
  }

  function updateEditorState() {
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
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveTagIndex((curr) => Math.min(curr + 1, filteredTags.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveTagIndex((curr) => Math.max(curr - 1, 0));
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
      setErrors((curr) => ({
        ...curr,
        tags: "Selecione uma tecnologia apresentada na lista.",
      }));
      return;
    }

    if (tags.includes(technology)) {
      setErrors((curr) => ({
        ...curr,
        tags: "Essa tecnologia já foi adicionada.",
      }));
      return;
    }

    if (tags.length >= MAX_TAGS) {
      setErrors((curr) => ({
        ...curr,
        tags: `Você pode adicionar no máximo ${MAX_TAGS} tecnologias.`,
      }));
      return;
    }

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
    setCollaborators((curr) => [...curr, person]);
    setCollaboratorInput("");
    setCollaboratorsOpen(false);
  }

  function removeCollaborator(collaboratorId) {
    setCollaborators((curr) => curr.filter((c) => c.id !== collaboratorId));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting || !canEdit) return;

    setErrors({});
    setFeedbackMessage("");
    setFeedbackType("");

    const projectData = {
      title,
      descriptionText,
      course,
      phase,
      tags,
      github,
      liveUrl,
      mediaCount: gallery.media.length,
    };

    const validationErrors = validateForm(projectData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setFeedbackType("error");
      setFeedbackMessage("Revise os campos destacados antes de salvar o projeto.");
      const firstInvalidField = document.querySelector(".is-invalid");
      firstInvalidField?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setIsSubmitting(true);
    let saved = false;

    try {
      const token =
        localStorage.getItem("techub_token") ||
        localStorage.getItem("token");

      if (gallery.hasPendingUploads) {
        setFeedbackType("");
        setFeedbackMessage("Enviando fotos e vídeos...");
      }

      let mediaPayload;
      try {
        mediaPayload = await gallery.buildMediaPayload(token);
      } catch (uploadError) {
        setErrors({ files: uploadError.message });
        setFeedbackType("error");
        setFeedbackMessage(uploadError.message);
        return;
      }

      setFeedbackType("");
      setFeedbackMessage("Salvando alterações...");

      const semesterNumber = phase
        ? parseInt(phase.replace(/\D/g, ""), 10)
        : 0;

      const collaboratorValues = collaborators.map(
        ({ id: collabId, contribution }) => ({
          id: collabId,
          contribution: contribution || null,
        })
      );
      const collaboratorsChanged =
        isOwner &&
        JSON.stringify(collaboratorValues) !==
          JSON.stringify(initialCollaboratorsRef.current);

      const payload = {
        title: title.trim(),
        description: descriptionText.trim(),
        major: course || null,
        semester: isNaN(semesterNumber) ? 0 : semesterNumber,
        technologies: tags,
        ...(collaboratorsChanged
          ? {
              collaborators: collaboratorValues.map(
                ({ id: userId, contribution }) => ({
                  userId,
                  ...(contribution ? { contribution } : {}),
                })
              ),
            }
          : {}),
        githubURL: github.trim() || null,
        liveURL: liveUrl.trim() || null,
        status: status || null,
        media: mediaPayload,
      };

      const response = await fetch(`${API_URL}/projects/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (data.errors && Array.isArray(data.errors)) {
          const backendErrors = {};
          data.errors.forEach((issue) => {
            const field = Array.isArray(issue.path)
              ? issue.path[0]
              : issue.path;
            if (field === "description")
              backendErrors.description = issue.message;
            else if (field === "major") backendErrors.course = issue.message;
            else if (field === "semester") backendErrors.phase = issue.message;
            else if (field === "technologies")
              backendErrors.tags = issue.message;
            else if (field === "media" || field?.startsWith("media."))
              backendErrors.files = issue.message;
            else if (field === "githubURL")
              backendErrors.github = issue.message;
            else if (field === "liveURL") backendErrors.liveUrl = issue.message;
            else if (field) backendErrors[field] = issue.message;
          });
          setErrors(backendErrors);
          setFeedbackType("error");
          setFeedbackMessage("Existem inconsistências nos dados informados.");
          return;
        }

        setFeedbackType("error");
        setFeedbackMessage(data.message || "Erro ao atualizar projeto.");
        return;
      }

      saved = true;
      setFeedbackType("success");
      setFeedbackMessage("Projeto atualizado com sucesso!");

      setTimeout(() => navigate(`/projetos/${id}`), 1200);
    } catch (err) {
      console.error(err);
      setFeedbackType("error");
      setFeedbackMessage(
        err.message || "Não foi possível conectar ao servidor."
      );
    } finally {
      if (!saved) setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <main className="new-project-page">
        <h1 className="new-project-title">Editar projeto</h1>
        <div
          className="new-project-card"
          style={{ padding: "3rem", textAlign: "center" }}
        >
          <p>Carregando dados do projeto...</p>
        </div>
      </main>
    );
  }

  if (!canEdit) {
    return (
      <main className="new-project-page">
        <h1 className="new-project-title">Editar projeto</h1>
        <div className="new-project-card" style={{ padding: "3rem" }}>