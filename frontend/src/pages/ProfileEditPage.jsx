import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CustomSelect from "../components/CustomSelect";

import "./ProfileEditPage.css";

const INITIAL_BIO =
  "Olá! Sou Antoni Ferraz, estudante de Ciência da Computação no IFSC Câmpus Lages, atualmente na 8ª fase do curso. Apaixonado por tecnologia desde cedo, encontrei no desenvolvimento web minha principal área de interesse e atuação.\n\nTenho experiência prática com React, Node.js e PostgreSQL, desenvolvendo aplicações web completas — do planejamento ao deploy. Também me interesso por testes de software, tendo trabalhado com ferramentas de automação e QA em projetos colaborativos.";

const INITIAL_INTERESTS = [
  "React",
  "Node.js",
  "Python",
  "PostgreSQL",
  "CSS",
  "HTML",
  "Git",
  "Figma",
  "Agile",
];

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

const STATUS_OPTIONS = [
  "Em formação",
  "Formado",
  "Egresso",
  "Matrícula trancada",
];

const INITIAL_FORM = {
  name: "Antoni Ferraz",
  slug: "antoni-ferraz",
  bio: INITIAL_BIO,
  github: "https://github.com/antoni-ferraz",
  linkedin: "https://linkedin.com/in/antoni-ferraz",
  campus: "IFSC Câmpus Lages",
  course: "Ciência da Computação",
  conclusionYear: "2026",
  conclusionSemester: "2",
  academicStatus: "Em formação",
};

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

  const [form, setForm] = useState(INITIAL_FORM);
  const [interests, setInterests] = useState(INITIAL_INTERESTS);
  const [interestInput, setInterestInput] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState("");

  const [bannerImage, setBannerImage] = useState(null);
  const [bannerPreview, setBannerPreview] = useState("");

  const [portfolioFile, setPortfolioFile] = useState(null);

  const [errors, setErrors] = useState({});
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackType, setFeedbackType] = useState("");

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
      validationErrors.name = "O nome deve possuir pelo menos 3 caracteres.";
    }

    if (!form.slug.trim()) {
      validationErrors.slug = "Informe um endereço para o perfil.";
    }

    if (!form.bio.trim()) {
      validationErrors.bio = "Escreva uma apresentação para o perfil.";
    } else if (form.bio.trim().length < 20) {
      validationErrors.bio =
        "A apresentação deve possuir pelo menos 20 caracteres.";
    }

    if (!isValidUrl(form.github)) {
      validationErrors.github = "Informe uma URL válida para o GitHub.";
    }

    if (!isValidUrl(form.linkedin)) {
      validationErrors.linkedin = "Informe uma URL válida para o LinkedIn.";
    }

    if (!form.campus.trim()) {
      validationErrors.campus = "Informe o campus.";
    }

    if (!form.course) {
      validationErrors.course = "Selecione o curso.";
    }

    if (!form.conclusionYear) {
      validationErrors.conclusionYear =
        "Informe o ano previsto para conclusão.";
    }

    if (!form.conclusionSemester) {
      validationErrors.conclusionSemester = "Selecione o semestre.";
    }

    if (!form.academicStatus) {
      validationErrors.academicStatus = "Selecione o vínculo acadêmico.";
    }

    if (interests.length === 0) {
      validationErrors.interests = "Adicione pelo menos uma área de interesse.";
    }

    return validationErrors;
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
            <p>Configurações do perfil</p>
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
                      <span aria-hidden="true">AF</span>
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

                  <div className="profile-edit-field">
                    <span className="profile-edit-label">
                      <i
                        className="fa-solid fa-file-arrow-up"
                        aria-hidden="true"
                      />
                      Currículo ou portfólio
                    </span>

                    <label className="profile-edit-file">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.zip"
                        onChange={(event) =>
                          setPortfolioFile(event.target.files?.[0] || null)
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
                      <span aria-hidden="true">*</span>
                    </label>

                    <input
                      id="profile-campus"
                      name="campus"
                      type="text"
                      value={form.campus}
                      onChange={handleChange}
                      className={errors.campus ? "is-invalid" : ""}
                    />

                    {errors.campus && (
                      <span className="profile-edit-error" role="alert">
                        {errors.campus}
                      </span>
                    )}
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

                  <div className="profile-edit-conclusion">
                    <div className="profile-edit-field">
                      <label htmlFor="profile-conclusion-year">
                        Ano
                        <span aria-hidden="true">*</span>
                      </label>

                      <input
                        id="profile-conclusion-year"
                        name="conclusionYear"
                        type="number"
                        min="2025"
                        max="2100"
                        value={form.conclusionYear}
                        onChange={handleChange}
                        className={errors.conclusionYear ? "is-invalid" : ""}
                      />
                    </div>

                    <div className="profile-edit-field">
                      <label htmlFor="profile-conclusion-semester">
                        Semestre
                        <span aria-hidden="true">*</span>
                      </label>

                      <CustomSelect
                        id="profile-conclusion-semester"
                        name="conclusionSemester"
                        value={form.conclusionSemester}
                        onChange={handleChange}
                        invalid={Boolean(errors.conclusionSemester)}
                        placeholder="Selecione"
                        options={[
                          {
                            value: "",
                            label: "Selecione",
                          },
                          {
                            value: "1",
                            label: "1º semestre",
                          },
                          {
                            value: "2",
                            label: "2º semestre",
                          },
                        ]}
                      />
                    </div>
                  </div>

                  {(errors.conclusionYear || errors.conclusionSemester) && (
                    <span className="profile-edit-error" role="alert">
                      {errors.conclusionYear || errors.conclusionSemester}
                    </span>
                  )}

                  <div className="profile-edit-field">
                    <label htmlFor="profile-academic-status">
                      Vínculo acadêmico
                      <span aria-hidden="true">*</span>
                    </label>

                    <CustomSelect
                      id="profile-academic-status"
                      name="academicStatus"
                      value={form.academicStatus}
                      onChange={handleChange}
                      invalid={Boolean(errors.academicStatus)}
                      placeholder="Selecione o vínculo"
                      options={[
                        {
                          value: "",
                          label: "Selecione o vínculo",
                        },
                        ...STATUS_OPTIONS.map((status) => ({
                          value: status,
                          label: status,
                        })),
                      ]}
                    />

                    {errors.academicStatus && (
                      <span className="profile-edit-error" role="alert">
                        {errors.academicStatus}
                      </span>
                    )}
                  </div>
                </div>
              </section>
            </aside>
          </div>

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
    </main>
  );
}
