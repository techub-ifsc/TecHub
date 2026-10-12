import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CustomSelect from "../components/CustomSelect";
import ConfirmationModal from "../components/ConfirmationModal";
import { useAuth } from "../context/AuthContext";

import "./ProfileEditPage.css";

const INITIAL_BIO = "";

const INITIAL_INTERESTS = [];

const TECHNOLOGY_OPTIONS = [
  "JavaScript",
  "TypeScript",
  "Python",
  "Java",
  "C",
  "C++",
  "C#",
  "Go",
  "Rust",
  "Ruby",
  "PHP",
  "Swift",
  "Kotlin",
  "Dart",
  "React",
  "Vue.js",
  "Angular",
  "Svelte",
  "Next.js",
  "Nuxt.js",
  "HTML",
  "CSS",
  "Sass/SCSS",
  "Tailwind CSS",
  "Bootstrap",
  "Node.js",
  "Express.js",
  "NestJS",
  "Django",
  "Flask",
  "Spring Boot",
  "Laravel",
  "React Native",
  "Flutter",
  "Android",
  "iOS",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "SQLite",
  "Firebase",
  "Supabase",
  "Docker",
  "Kubernetes",
  "AWS",
  "Google Cloud",
  "Azure",
  "GitHub Actions",
  "CI/CD",
  "Linux",
  "Machine Learning",
  "Inteligência Artificial",
  "Data Science",
  "Cybersecurity",
  "UI/UX Design",
  "Figma",
  "Acessibilidade",
  "Prototipação",
  "Agile",
  "Scrum",
  "Kanban",
  "TDD",
  "Clean Code",
  "SOLID",
  "API REST",
  "GraphQL",
  "Git",
  "GitHub",
  "GitLab",
  "Jira",
  "Notion",
  "Postman",
];

const COURSE_OPTIONS = [
  "Ciência da Computação",
  "Técnico em Informática para Internet",
  "Técnico em Desenvolvimento de Sistemas",
];

const COURSE_PHASES = {
  "Ciência da Computação": 8,
  "Técnico em Informática para Internet": 4,
  "Técnico em Desenvolvimento de Sistemas": 3,
};

const INITIAL_FORM = {
  name: "",
  slug: "",
  bio: INITIAL_BIO,
  github: "",
  linkedin: "",
  campus: "IFSC Câmpus Lages",
  course: "",
  phase: "",
};

const INITIAL_PROFILE_PROJECTS = [
  {
    id: 1,
    title: "Sistema de Monitoramento Ambiental",
    description:
      "Plataforma para acompanhar sensores ambientais em tempo real.",
    status: "Em desenvolvimento",
    technologies: ["React", "Node.js", "PostgreSQL"],
    updatedAt: "Atualizado hoje",
  },
  {
    id: 2,
    title: "Biblioteca Digital IFSC",
    description:
      "Aplicação para organizar e disponibilizar materiais acadêmicos.",
    status: "Em design",
    technologies: ["React", "Express", "Sequelize"],
    updatedAt: "Atualizado ontem",
  },
  {
    id: 3,
    title: "Controle Inteligente de Laboratórios",
    description:
      "Sistema para reservas e acompanhamento dos laboratórios.",
    status: "Concluído",
    technologies: ["JavaScript", "Vite", "PostgreSQL"],
    updatedAt: "Atualizado em 7 de outubro",
  },
];

const PROJECT_STATUS_OPTIONS = [
  "Em design",
  "Em desenvolvimento",
  "Concluído",
  "Pausado",
];
function readStoredProfile(storageKey) {
  try {
    const storedValue = localStorage.getItem(storageKey);

    return storedValue ? JSON.parse(storedValue) : null;
  } catch {
    return null;
  }
}
function normalizeSlug(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function isValidUrl(value) {
  if (!value.trim()) {
    return true;
  }

  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default function ProfileEditPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const profileStorageKey =
    `techub:creator-profile:${user?.id || id}`;

  const storedProfile = useMemo(
    () => readStoredProfile(profileStorageKey),
    [profileStorageKey],
  );

  const [form, setForm] = useState(() => {
    const accountName = user?.name?.trim() || "";

    return {
      ...INITIAL_FORM,
      ...(storedProfile?.form || {}),
      name: storedProfile?.form?.name || accountName,
      slug:
        storedProfile?.form?.slug ||
        normalizeSlug(accountName),
    };
  });

  const [interests, setInterests] = useState(
    () => storedProfile?.interests || INITIAL_INTERESTS,
  );
  const [interestInput, setInterestInput] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState("");

  const [bannerImage, setBannerImage] = useState(null);
  const [bannerPreview, setBannerPreview] = useState("");

  const [portfolioFile, setPortfolioFile] = useState(null);

  const [profileProjects, setProfileProjects] = useState(
    INITIAL_PROFILE_PROJECTS,
  );
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [projectEditForm, setProjectEditForm] = useState({
    title: "",
    description: "",
    status: "",
  });
  const [projectToDelete, setProjectToDelete] = useState(null);

  const [errors, setErrors] = useState({});
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackType, setFeedbackType] = useState("");

  const profileInitials =
    form.name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase() || "U";

  const phaseOptions = form.course
    ? [
        ...Array.from(
          { length: COURSE_PHASES[form.course] || 0 },
          (_, index) => `${index + 1}ª fase`,
        ),
        "Curso concluído",
      ]
    : [];

  const filteredTechnologies = useMemo(() => {
    const search = interestInput.trim().toLowerCase();

    return TECHNOLOGY_OPTIONS.filter((technology) => {
      const matchesSearch =
        !search || technology.toLowerCase().includes(search);

      const isNotSelected = !interests.some(
        (interest) => interest.toLowerCase() === technology.toLowerCase(),
      );

      return matchesSearch && isNotSelected;
    }).slice(0, 8);
  }, [interestInput, interests]);

  function clearFeedback() {
    setFeedbackMessage("");
    setFeedbackType("");
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: name === "slug" ? normalizeSlug(value) : value,
      ...(name === "course" ? { phase: "" } : {}),
    }));

    setErrors((currentErrors) => ({
      ...currentErrors,
      [name]: "",
    }));

    clearFeedback();
  }

  function handleImageChange(event, type) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setFeedbackType("error");
      setFeedbackMessage("Selecione um arquivo de imagem válido.");
      event.target.value = "";
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    if (type === "profile") {
      if (profilePhotoPreview) {
        URL.revokeObjectURL(profilePhotoPreview);
      }

      setProfilePhoto(file);
      setProfilePhotoPreview(previewUrl);
    } else {
      if (bannerPreview) {
        URL.revokeObjectURL(bannerPreview);
      }

      setBannerImage(file);
      setBannerPreview(previewUrl);
    }

    clearFeedback();
  }

  function addInterest(technology) {
    const selectedTechnology = technology || interestInput.trim();

    if (!selectedTechnology) {
      return;
    }

    const alreadySelected = interests.some(
      (interest) => interest.toLowerCase() === selectedTechnology.toLowerCase(),
    );

    if (alreadySelected) {
      setFeedbackType("error");
      setFeedbackMessage("Essa área de interesse já foi adicionada.");
      return;
    }

    if (interests.length >= 12) {
      setFeedbackType("error");
      setFeedbackMessage(
        "Você pode selecionar no máximo 12 áreas de interesse.",
      );
      return;
    }

    setInterests((currentInterests) => [
      ...currentInterests,
      selectedTechnology,
    ]);

    setInterestInput("");
    setSuggestionsOpen(false);
    clearFeedback();
  }

  function removeInterest(technologyToRemove) {
    setInterests((currentInterests) =>
      currentInterests.filter(
        (technology) => technology !== technologyToRemove,
      ),
    );

    clearFeedback();
  }

  function handleInterestKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();

      if (filteredTechnologies.length > 0) {
        addInterest(filteredTechnologies[0]);
      } else {
        addInterest();
      }
    }

    if (event.key === "Escape") {
      setSuggestionsOpen(false);
    }
  }

  function validateForm() {
    const validationErrors = {};

    if (!form.name.trim()) {
      validationErrors.name = "Informe o nome do criador.";
    } else if (form.name.trim().length < 3) {
      validationErrors.name =
        "O nome deve possuir pelo menos 3 caracteres.";
    }

    if (!form.slug.trim()) {
      validationErrors.slug =
        "Informe um endereço para o perfil.";
    }

    if (!isValidUrl(form.github)) {
      validationErrors.github =
        "Informe uma URL válida para o GitHub.";
    }

    if (!isValidUrl(form.linkedin)) {
      validationErrors.linkedin =
        "Informe uma URL válida para o LinkedIn.";
    }

    if (!form.course) {
      validationErrors.course = "Selecione o curso.";
    }

    if (!form.phase) {
      validationErrors.phase =
        "Selecione a fase ou informe que o curso foi concluído.";
    }

    return validationErrors;
  }

  function startEditingProject(project) {
    setEditingProjectId(project.id);
    setProjectEditForm({
      title: project.title,
      description: project.description,
      status: project.status,
    });
    clearFeedback();
  }

  function handleProjectEditChange(event) {
    const { name, value } = event.target;

    setProjectEditForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  function saveProjectEdit() {
    const title = projectEditForm.title.trim();
    const description = projectEditForm.description.trim();

    if (!title || !description || !projectEditForm.status) {
      setFeedbackType("error");
      setFeedbackMessage(
        "Preencha título, descrição e status antes de salvar o projeto.",
      );
      return;
    }

    setProfileProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.id === editingProjectId
          ? {
              ...project,
              title,
              description,
              status: projectEditForm.status,
              updatedAt: "Atualizado agora",
            }
          : project,
      ),
    );

    setEditingProjectId(null);
    setFeedbackType("success");
    setFeedbackMessage("Projeto atualizado com sucesso.");
  }

  function cancelProjectEdit() {
    setEditingProjectId(null);
    setProjectEditForm({
      title: "",
      description: "",
      status: "",
    });
    clearFeedback();
  }

  function confirmProjectDeletion() {
    if (!projectToDelete) {
      return;
    }

    setProfileProjects((currentProjects) =>
      currentProjects.filter(
        (project) => project.id !== projectToDelete.id,
      ),
    );

    setProjectToDelete(null);
    setEditingProjectId(null);
    setFeedbackType("success");
    setFeedbackMessage("Projeto excluído com sucesso.");
  }
  function handleSubmit(event) {
    event.preventDefault();

    const validationErrors = validateForm();

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setFeedbackType("error");
      setFeedbackMessage("Revise os campos destacados antes de salvar.");

      window.setTimeout(() => {
        document.querySelector(".profile-edit-error")?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 0);

      return;
    }

    const profileData = {
      ...form,
      name: form.name.trim(),
      slug: form.slug.trim(),
      bio: form.bio.trim(),
      github: form.github.trim(),
      linkedin: form.linkedin.trim(),
      campus: form.campus.trim(),
      interests,
      profilePhoto,
      bannerImage,
      portfolioFile,
    };

    localStorage.setItem(
      profileStorageKey,
      JSON.stringify({
        form: {
          name: profileData.name,
          slug: profileData.slug,
          bio: profileData.bio,
          github: profileData.github,
          linkedin: profileData.linkedin,
          campus: profileData.campus,
          course: profileData.course,
          phase: profileData.phase,
        },
        interests,
        savedAt: new Date().toISOString(),
      }),
    );

    console.log("Perfil pronto para atualização:", profileData);

    setFeedbackType("success");
    setFeedbackMessage(
      "Perfil validado com sucesso! A integração com o backend será realizada em uma próxima etapa.",
    );
  }

  function handleCancel() {
    navigate(`/criadores/${id}`);
  }

  return (
    <main className="profile-edit-page">
      <div className="profile-edit-page__container">
        <button
          type="button"
          className="profile-edit-page__back"
          onClick={handleCancel}
        >
          <i className="fa-solid fa-arrow-left" aria-hidden="true" />
          Voltar para o perfil
        </button>

        <div className="profile-edit-page__heading">
          <div>

            <h1>Editar perfil</h1>
          </div>

          <span>Perfil #{id}</span>
        </div>

        <form className="profile-edit-form" onSubmit={handleSubmit} noValidate>
          <div className="profile-edit-layout">
            <div className="profile-edit-main">
              <section className="profile-edit-card profile-edit-identity">
                <div
                  className="profile-edit-banner"
                  style={
                    bannerPreview
                      ? {
                          backgroundImage: `url("${bannerPreview}")`,
                        }
                      : undefined
                  }
                >
                  <label
                    className="profile-edit-image-button profile-edit-banner__button"
                    title="Alterar imagem de capa"
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => handleImageChange(event, "banner")}
                    />

                    <i className="fa-solid fa-camera" aria-hidden="true" />

                    <span>Alterar capa</span>
                  </label>
                </div>

                <div className="profile-edit-identity__content">
                  <label className="profile-edit-avatar">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => handleImageChange(event, "profile")}
                    />

                    {profilePhotoPreview ? (
                      <img
                        src={profilePhotoPreview}
                        alt="Prévia da nova foto de perfil"
                      />
                    ) : (
                      <span aria-hidden="true">
                        {profileInitials}
                      </span>
                    )}

                    <span className="profile-edit-avatar__overlay">
                      <i className="fa-solid fa-camera" aria-hidden="true" />
                    </span>
                  </label>

                  <div className="profile-edit-identity__fields">
                    <div className="profile-edit-field">
                      <label htmlFor="profile-name">
                        Nome
                        <span aria-hidden="true">*</span>
                      </label>

                      <input
                        id="profile-name"
                        name="name"
                        type="text"
                        value={form.name}
                        onChange={handleChange}
                        className={errors.name ? "is-invalid" : ""}
                        aria-invalid={Boolean(errors.name)}
                        maxLength={80}
                      />

                      {errors.name && (
                        <span className="profile-edit-error" role="alert">
                          {errors.name}
                        </span>
                      )}
                    </div>

                    <div className="profile-edit-field">
                      <label htmlFor="profile-slug">
                        Endereço do perfil
                        <span aria-hidden="true">*</span>
                      </label>

                      <div
                        className={`profile-edit-slug ${
                          errors.slug ? "is-invalid" : ""
                        }`}
                      >
                        <span>/p/</span>

                        <input
                          id="profile-slug"
                          name="slug"
                          type="text"
                          value={form.slug}
                          onChange={handleChange}
                          aria-invalid={Boolean(errors.slug)}
                          maxLength={50}
                        />
                      </div>

                      {errors.slug && (
                        <span className="profile-edit-error" role="alert">
                          {errors.slug}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <section className="profile-edit-card">
                <div className="profile-edit-card__heading">
                  <div>
                    <h2>Bio</h2>
                    <p>
                      Conte um pouco sobre sua formação, seus interesses e sua
                      experiência.
                    </p>
                  </div>

                  <span>{form.bio.length}/500</span>
                </div>

                <div className="profile-edit-field">
                  <textarea
                    id="profile-bio"
                    name="bio"
                    value={form.bio}
                    onChange={handleChange}
                    className={errors.bio ? "is-invalid" : ""}
                    aria-label="Bio ou apresentação"
                    aria-invalid={Boolean(errors.bio)}
                    maxLength={500}
                  />

                  {errors.bio && (
                    <span className="profile-edit-error" role="alert">
                      {errors.bio}
                    </span>
                  )}
                </div>
              </section>
            </div>

            <aside className="profile-edit-sidebar">
              <section className="profile-edit-card">
                <h2>Áreas de interesse</h2>

                <p className="profile-edit-card__description">
                  Selecione até 12 tecnologias e áreas de atuação.
                </p>

                <div className="profile-edit-interests">
                  {interests.map((technology) => (
                    <span key={technology}>
                      {technology}

                      <button
                        type="button"
                        onClick={() => removeInterest(technology)}
                        aria-label={`Remover ${technology}`}
                        title={`Remover ${technology}`}
                      >
                        <i className="fa-solid fa-xmark" aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="profile-edit-interest-search">
                  <div
                    className={`profile-edit-interest-input ${
                      errors.interests ? "is-invalid" : ""
                    }`}
                  >
                    <input
                      type="text"
                      value={interestInput}
                      onChange={(event) => {
                        setInterestInput(event.target.value);
                        setSuggestionsOpen(true);
                      }}
                      onFocus={() => setSuggestionsOpen(true)}
                      onKeyDown={handleInterestKeyDown}
                      placeholder="Buscar tecnologia"
                      autoComplete="off"
                    />

                    <button
                      type="button"
                      onClick={() => addInterest()}
                      aria-label="Adicionar interesse"
                      title="Adicionar interesse"
                    >
                      <i className="fa-solid fa-plus" aria-hidden="true" />
                    </button>
                  </div>

                  {suggestionsOpen && filteredTechnologies.length > 0 && (
                    <ul className="profile-edit-suggestions">
                      {filteredTechnologies.map((technology) => (
                        <li key={technology}>
                          <button
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => addInterest(technology)}
                          >
                            {technology}
                            <span aria-hidden="true">+</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {errors.interests && (
                  <span className="profile-edit-error" role="alert">
                    {errors.interests}
                  </span>
                )}
              </section>

              <section className="profile-edit-card">
                <h2>Links e contato</h2>

                <div className="profile-edit-contact-fields">
                  <div className="profile-edit-field">
                    <label htmlFor="profile-github">
                      <i className="fa-brands fa-github" aria-hidden="true" />
                      GitHub
                    </label>

                    <input
                      id="profile-github"
                      name="github"
                      type="url"
                      value={form.github}
                      onChange={handleChange}
                      className={errors.github ? "is-invalid" : ""}
                      placeholder="https://github.com/usuario"
                    />

                    {errors.github && (
                      <span className="profile-edit-error" role="alert">
                        {errors.github}
                      </span>
                    )}
                  </div>

                  <div className="profile-edit-field">
                    <label htmlFor="profile-linkedin">
                      <i className="fa-brands fa-linkedin" aria-hidden="true" />
                      LinkedIn
                    </label>

                    <input
                      id="profile-linkedin"
                      name="linkedin"
                      type="url"
                      value={form.linkedin}
                      onChange={handleChange}
                      className={errors.linkedin ? "is-invalid" : ""}
                      placeholder="https://linkedin.com/in/usuario"
                    />

                    {errors.linkedin && (
                      <span className="profile-edit-error" role="alert">
                        {errors.linkedin}
                      </span>
                    )}
                  </div>

                  <div className="profile-edit-portfolio-row">
                    <span className="profile-edit-label">
                      <i
                        className="fa-solid fa-file-arrow-up"
                        aria-hidden="true"
                      />
                      Currículo ou portfólio
                    </span>

                    <span
                      className="profile-edit-portfolio-divider"
                      aria-hidden="true"
                    />

                    <label className="profile-edit-file">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.zip"
                        onChange={(event) =>
                          setPortfolioFile(
                            event.target.files?.[0] || null,
                          )
                        }
                      />

                      <i
                        className="fa-solid fa-cloud-arrow-up"
                        aria-hidden="true"
                      />

                      <span>
                        {portfolioFile
                          ? portfolioFile.name
                          : "Selecionar arquivo"}
                      </span>
                    </label>
                  </div>
                </div>
              </section>

              <section className="profile-edit-card">
                <h2>Situação acadêmica</h2>

                <div className="profile-edit-academic-fields">
                  <div className="profile-edit-field">
                    <label htmlFor="profile-campus">
                      Campus
                    </label>

                    <input
                      id="profile-campus"
                      name="campus"
                      type="text"
                      value={form.campus}
                      readOnly
                      aria-readonly="true"
                      className="is-readonly"
                    />
                  </div>

                  <div className="profile-edit-field">
                    <label htmlFor="profile-course">
                      Curso
                      <span aria-hidden="true">*</span>
                    </label>

                    <CustomSelect
                      id="profile-course"
                      name="course"
                      value={form.course}
                      onChange={handleChange}
                      invalid={Boolean(errors.course)}
                      placeholder="Selecione o curso"
                      options={[
                        {
                          value: "",
                          label: "Selecione o curso",
                        },
                        ...COURSE_OPTIONS.map((course) => ({
                          value: course,
                          label: course,
                        })),
                      ]}
                    />

                    {errors.course && (
                      <span className="profile-edit-error" role="alert">
                        {errors.course}
                      </span>
                    )}
                  </div>

                  <div className="profile-edit-field">
                    <label htmlFor="profile-phase">
                      Fase
                      <span aria-hidden="true">*</span>
                    </label>

                    <CustomSelect
                      id="profile-phase"
                      name="phase"
                      value={form.phase}
                      onChange={handleChange}
                      disabled={!form.course}
                      invalid={Boolean(errors.phase)}
                      placeholder={
                        form.course
                          ? "Selecione a fase"
                          : "Selecione primeiro o curso"
                      }
                      options={[
                        {
                          value: "",
                          label: form.course
                            ? "Selecione a fase"
                            : "Selecione primeiro o curso",
                        },
                        ...phaseOptions.map((phase) => ({
                          value: phase,
                          label: phase,
                        })),
                      ]}
                    />

                    {errors.phase && (
                      <span className="profile-edit-error" role="alert">
                        {errors.phase}
                      </span>
                    )}
                  </div>
                </div>
              </section>
            </aside>
          </div>

          <section className="profile-edit-card profile-edit-projects">
            <div className="profile-edit-projects__heading">
              <div>
                <h2>Meus projetos</h2>
                <p>
                  Gerencie os projetos vinculados ao seu perfil de criador.
                </p>
              </div>

              <button
                type="button"
                className="profile-edit-projects__create"
                onClick={() => navigate("/projeto/novo")}
              >
                <i className="fa-solid fa-plus" aria-hidden="true" />
                Novo projeto
              </button>
            </div>

            {profileProjects.length > 0 ? (
              <div className="profile-edit-projects__list">
                {profileProjects.map((project) => {
                  const isEditing = editingProjectId === project.id;

                  return (
                    <article
                      key={project.id}
                      className={`profile-edit-project${
                        isEditing ? " is-editing" : ""
                      }`}
                    >
                      <div className="profile-edit-project__header">
                        <span className="profile-edit-project__icon">
                          <i
                            className="fa-regular fa-folder-open"
                            aria-hidden="true"
                          />
                        </span>

                        <div>
                          <span className="profile-edit-project__status">
                            {project.status}
                          </span>
                          <small>{project.updatedAt}</small>
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="profile-edit-project__editor">
                          <div className="profile-edit-field">
                            <label htmlFor={`project-title-${project.id}`}>
                              Título
                            </label>

                            <input
                              id={`project-title-${project.id}`}
                              name="title"
                              type="text"
                              value={projectEditForm.title}
                              onChange={handleProjectEditChange}
                              maxLength={100}
                            />
                          </div>

                          <div className="profile-edit-field">
                            <label
                              htmlFor={`project-description-${project.id}`}
                            >
                              Descrição
                            </label>

                            <textarea
                              id={`project-description-${project.id}`}
                              name="description"
                              value={projectEditForm.description}
                              onChange={handleProjectEditChange}
                              maxLength={500}
                            />
                          </div>

                          <div className="profile-edit-field">
                            <label htmlFor={`project-status-${project.id}`}>
                              Status
                            </label>

                            <CustomSelect
                              id={`project-status-${project.id}`}
                              name="status"
                              value={projectEditForm.status}
                              onChange={handleProjectEditChange}
                              options={PROJECT_STATUS_OPTIONS.map(
                                (statusOption) => ({
                                  value: statusOption,
                                  label: statusOption,
                                }),
                              )}
                            />
                          </div>

                          <div className="profile-edit-project__edit-actions">
                            <button
                              type="button"
                              className="profile-edit-project__cancel"
                              onClick={cancelProjectEdit}
                            >
                              Cancelar
                            </button>

                            <button
                              type="button"
                              className="profile-edit-project__save"
                              onClick={saveProjectEdit}
                            >
                              <i
                                className="fa-solid fa-check"
                                aria-hidden="true"
                              />
                              Salvar projeto
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="profile-edit-project__content">
                            <h3>{project.title}</h3>
                            <p>{project.description}</p>

                            <div className="profile-edit-project__technologies">
                              {project.technologies.map((technology) => (
                                <span key={technology}>{technology}</span>
                              ))}
                            </div>
                          </div>

                          <div className="profile-edit-project__actions">
                            <button
                              type="button"
                              className="profile-edit-project__view"
                              onClick={() =>
                                navigate(`/projetos/${project.id}`)
                              }
                            >
                              <i
                                className="fa-regular fa-eye"
                                aria-hidden="true"
                              />
                              Visualizar
                            </button>

                            <button
                              type="button"
                              className="profile-edit-project__edit"
                              onClick={() =>
                                navigate(`/projetos/${project.id}/editar`)
                              }
                            >
                              <i
                                className="fa-solid fa-pen"
                                aria-hidden="true"
                              />
                              Editar
                            </button>

                            <button
                              type="button"
                              className="profile-edit-project__delete"
                              onClick={() => setProjectToDelete(project)}
                            >
                              <i
                                className="fa-regular fa-trash-can"
                                aria-hidden="true"
                              />
                              Excluir
                            </button>
                          </div>
                        </>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="profile-edit-projects__empty">
                <i className="fa-regular fa-folder-open" aria-hidden="true" />
                <strong>Nenhum projeto publicado</strong>
                <p>
                  Crie seu primeiro projeto para exibi-lo no perfil.
                </p>
              </div>
            )}
          </section>
          {feedbackMessage && (
            <p
              className={`profile-edit-feedback ${feedbackType}`}
              role={feedbackType === "error" ? "alert" : "status"}
            >
              {feedbackMessage}
            </p>
          )}

          <div className="profile-edit-actions">
            <button
              type="button"
              className="profile-edit-actions__cancel"
              onClick={handleCancel}
            >
              Cancelar
            </button>

            <button type="submit" className="profile-edit-actions__save">
              Salvar alterações
            </button>
          </div>
        </form>
      </div>
    <ConfirmationModal
        open={Boolean(projectToDelete)}
        tone="danger"
        title="Excluir projeto?"
        description={
          projectToDelete
            ? `O projeto "${projectToDelete.title}" será removido do seu perfil. Esta ação não poderá ser desfeita.`
            : ""
        }
        confirmLabel="Sim, excluir"
        cancelLabel="Cancelar"
        onCancel={() => setProjectToDelete(null)}
        onConfirm={confirmProjectDeletion}
      />

      </main>
  );
}
