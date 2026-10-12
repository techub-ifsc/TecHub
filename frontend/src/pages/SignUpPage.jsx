import { useState } from "react";
import { Link } from "react-router-dom";
import "./SignUpPage.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

const INITIAL_FORM = {
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateForm(form) {
  const validationErrors = {};

  const username = form.username.trim();
  const email = form.email.trim();

  if (!username) {
    validationErrors.username = "O nome de usuário é obrigatório.";
  } else if (username.length < 3) {
    validationErrors.username = "Informe pelo menos 3 caracteres.";
  }

  if (!email) {
    validationErrors.email = "O e-mail é obrigatório.";
  } else if (!EMAIL_REGEX.test(email)) {
    validationErrors.email = "Digite um e-mail válido.";
  }

  if (!form.password) {
    validationErrors.password = "A senha é obrigatória.";
  } else if (form.password.length < 8) {
    validationErrors.password = "A senha deve ter pelo menos 8 caracteres.";
  } else if (
    !/[A-Za-z]/.test(form.password) ||
    !/[0-9]/.test(form.password)
  ) {
    validationErrors.password =
      "A senha deve conter pelo menos uma letra e um número.";
  }

  if (!form.confirmPassword) {
    validationErrors.confirmPassword = "Confirme sua senha.";
  } else if (form.confirmPassword !== form.password) {
    validationErrors.confirmPassword = "As senhas não coincidem.";
  }

  return validationErrors;
}

export default function SignUpPage() {
  const [accountType, setAccountType] = useState("creator");
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function handleAccountType(type) {
    setAccountType(type);

    setErrors((currentErrors) => ({
      ...currentErrors,
      email: "",
    }));

    setSuccessMessage("");
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    setErrors((currentErrors) => ({
      ...currentErrors,
      [name]: "",
      general: "",
    }));

    setSuccessMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validationErrors = validateForm(form);
    setErrors(validationErrors);
    setSuccessMessage("");

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.username,
          email: form.email.trim().toLowerCase(),
          password: form.password,
          accountType,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Trata erros de validação Zod da API
        if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
          const backendErrors = {};
          data.errors.forEach((err) => {
            const field = Array.isArray(err.path) ? err.path[0] : err.path;
            // Mapeia o campo "name" do backend de volta para o "username" do formulário
            if (field === "name") backendErrors.username = err.message;
            else if (field === "email") backendErrors.email = err.message;
            else if (field === "password") backendErrors.password = err.message;
            else if (field) backendErrors[field] = err.message;
          });
          setErrors(backendErrors);
          return;
        }

        // Duplicidade (409)
        if (response.status === 409) {
          setErrors({ email: data.message || "Já existe uma conta com este e-mail." });
          return;
        }

        // Demais erros
        setErrors({ general: data.message || "Erro ao realizar cadastro." });
        return;
      }

      // Sucesso (Status 201)
      setSuccessMessage(data.message || "Cadastro realizado com sucesso!");
      setForm(INITIAL_FORM);
    } catch (err) {
      setErrors({
        general:
          "Não foi possível conectar ao servidor. Verifique se a API está ativa.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="signup-page">
      <h1 className="signup-page__title">Nova conta</h1>

      <form className="signup-form" onSubmit={handleSubmit} noValidate>
        <fieldset className="signup-form__account-type">
          <legend>Selecione o tipo da conta</legend>

          <div className="signup-form__account-options">
            <button
              type="button"
              className={`signup-form__account-button ${
                accountType === "creator" ? "is-selected" : ""
              }`}
              onClick={() => handleAccountType("creator")}
              aria-pressed={accountType === "creator"}
            >
              Criador
            </button>

            <button
              type="button"
              className={`signup-form__account-button ${
                accountType === "visitor" ? "is-selected" : ""
              }`}
              onClick={() => handleAccountType("visitor")}
              aria-pressed={accountType === "visitor"}
            >
              Visitante
            </button>
          </div>
        </fieldset>

        <div className="signup-form__field">
          <label htmlFor="username">
            Nome de usuário
            <span aria-hidden="true">*</span>
          </label>

          <input
            id="username"
            name="username"
            type="text"
            value={form.username}
            onChange={handleChange}
            className={errors.username ? "is-invalid" : ""}
            aria-invalid={Boolean(errors.username)}
            aria-describedby={
              errors.username ? "username-error" : undefined
            }
            autoComplete="username"
            required
          />

          {errors.username && (
            <span
              id="username-error"
              className="signup-form__error"
              role="alert"
            >
              {errors.username}
            </span>
          )}
        </div>

        <div className="signup-form__field">
          <label htmlFor="email">
            {accountType === "creator"
              ? "E-mail institucional do IFSC"
              : "E-mail"}

            <span aria-hidden="true">*</span>
          </label>

          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder={
              accountType === "creator"
                ? "aluno@ifsc.edu.br"
                : "voce@email.com"
            }
            className={errors.email ? "is-invalid" : ""}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            autoComplete="email"
            required
          />

          {errors.email && (
            <span id="email-error" className="signup-form__error" role="alert">
              {errors.email}
            </span>
          )}
        </div>

        <div className="signup-form__field">
          <label htmlFor="password">
            Senha
            <span aria-hidden="true">*</span>
          </label>

          <input
            id="password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            className={errors.password ? "is-invalid" : ""}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={
              errors.password ? "password-error" : "password-help"
            }
            autoComplete="new-password"
            required
          />

          {errors.password ? (
            <span
              id="password-error"
              className="signup-form__error"
              role="alert"
            >
              {errors.password}
            </span>
          ) : (
            <span id="password-help" className="signup-form__helper">
              Mínimo de 8 caracteres, contendo pelo menos uma letra e um número.
            </span>
          )}
        </div>

        <div className="signup-form__field">
          <label htmlFor="confirmPassword">
            Confirmar senha
            <span aria-hidden="true">*</span>
          </label>

          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={handleChange}
            className={errors.confirmPassword ? "is-invalid" : ""}
            aria-invalid={Boolean(errors.confirmPassword)}
            aria-describedby={
              errors.confirmPassword ? "confirm-password-error" : undefined
            }
            autoComplete="new-password"
            required
          />

          {errors.confirmPassword && (
            <span
              id="confirm-password-error"
              className="signup-form__error"
              role="alert"
            >
              {errors.confirmPassword}
            </span>
          )}
        </div>

        {successMessage && (
          <p
            className="signup-form__success"
            role="status"
            aria-live="polite"
          >
            {successMessage}
          </p>
        )}

        {errors.general && (
          <span
            className="signup-form__error"
            role="alert"
            style={{
              marginBottom: "12px",
              display: "block",
              textAlign: "center",
            }}
          >
            {errors.general}
          </span>
        )}

        <div className="signup-form__actions">
          <button
            type="submit"
            className="signup-form__submit"
            disabled={loading}
          >
            {loading ? "Criando conta..." : "Criar conta"}
          </button>

          <p className="signup-form__login">
            Já possui uma conta? <Link to="/login">Entrar</Link>
          </p>
        </div>
      </form>
    </main>
  );
}