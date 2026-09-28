import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import "./LoginPage.css";

const API_URL = import.meta.env.VITE_API_URL;

const INITIAL_FORM = {
  email: "",
  password: "",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateForm(form) {
  const validationErrors = {};

  const normalizedEmail = form.email.trim();

  if (!normalizedEmail) {
    validationErrors.email = "O e-mail é obrigatório.";
  } else if (!EMAIL_REGEX.test(normalizedEmail)) {
    validationErrors.email = "Digite um e-mail válido.";
  }

  if (!form.password) {
    validationErrors.password = "A senha é obrigatória.";
  } else if (form.password.length < 8) {
    validationErrors.password = "A senha deve possuir pelo menos 8 caracteres.";
  }

  return validationErrors;
}

export default function LoginPage() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

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
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          password: form.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors({
          general: data.message || "Não foi possível realizar o login.",
        });
        return;
      }

      // Salva a sessão no navegador
      localStorage.setItem("techub_token", data.token);
      localStorage.setItem("techub_user", JSON.stringify(data.user));

      setSuccessMessage("Login efetuado com sucesso! Redirecionando...");
      setTimeout(() => navigate("/"), 1000);
    } catch (err) {
      setErrors({
        general: "Erro ao conectar ao servidor. Verifique se o back-end está ativo.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <h1 className="login-page__title">Acessar plataforma</h1>

      <form
        className="login-form"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="login-form__field">
          <label htmlFor="login-email">
            E-mail
            <span className="login-form__required" aria-hidden="true">
              *
            </span>
          </label>

          <input
            id="login-email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="voce@email.com"
            className={errors.email ? "is-invalid" : ""}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "login-email-error" : undefined}
            autoComplete="email"
          />

          {errors.email && (
            <span
              id="login-email-error"
              className="login-form__error"
              role="alert"
            >
              {errors.email}
            </span>
          )}
        </div>

        <div className="login-form__field">
          <label htmlFor="login-password">
            Senha
            <span className="login-form__required" aria-hidden="true">
              *
            </span>
          </label>

          <div
            className={`login-form__password-wrapper ${
              errors.password ? "is-invalid" : ""
            }`}
          >
            <input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={handleChange}
              placeholder="Digite sua senha"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={
                errors.password
                  ? "login-password-error"
                  : "login-password-helper"
              }
              autoComplete="current-password"
            />

            <button
              type="button"
              className="login-form__password-toggle"
              onClick={() => setShowPassword((currentValue) => !currentValue)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              title={showPassword ? "Ocultar senha" : "Mostrar senha"}
              aria-pressed={showPassword}
            >
              <i
                className={`fa-solid ${
                  showPassword ? "fa-eye-slash" : "fa-eye"
                }`}
                aria-hidden="true"
              />
            </button>
          </div>

          {errors.password ? (
            <span
              id="login-password-error"
              className="login-form__error"
              role="alert"
            >
              {errors.password}
            </span>
          ) : (
            <span
              id="login-password-helper"
              className="login-form__helper"
            >
              A senha deve possuir pelo menos 8 caracteres.
            </span>
          )}
        </div>

        <div className="login-form__forgot-password">
          <button
            type="button"
            disabled
            title="A recuperação de senha estará disponível em breve"
          >
            Esqueceu a senha?
          </button>
        </div>

        {successMessage && (
          <p className="login-form__success" role="status">
            {successMessage}
          </p>
        )}

        <div className="login-form__actions">
          <button type="submit" className="login-form__submit">
            Entrar
          </button>

          <p className="login-form__signup">
            Ainda não possui uma conta?{" "}
            <Link to="/cadastro">Criar conta</Link>
          </p>
        </div>
      </form>
    </main>
  );
}
