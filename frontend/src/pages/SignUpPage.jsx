import { useState } from "react";

import "./SignUpPage.css";

const initialForm = {
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
};

function validateForm(form) {
  const errors = {};

  if (!form.username.trim()) {
    errors.username = "O nome de usuário é obrigatório.";
  } else if (form.username.trim().length < 3) {
    errors.username = "Informe pelo menos 3 caracteres.";
  }

  if (!form.email.trim()) {
    errors.email = "O e-mail é obrigatório.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = "Digite um e-mail válido.";
  }

  if (!form.password) {
    errors.password = "A senha é obrigatória.";
  } else if (form.password.length < 8) {
    errors.password = "A senha deve ter pelo menos 8 caracteres.";
  } else if (
    !/[A-Za-z]/.test(form.password) ||
    !/[0-9]/.test(form.password)
  ) {
    errors.password = "A senha deve conter pelo menos uma letra e um número.";
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = "Confirme sua senha.";
  } else if (form.confirmPassword !== form.password) {
    errors.confirmPassword = "As senhas não coincidem.";
  }

  return errors;
}

export default function SignUpPage() {
  const [accountType, setAccountType] = useState("criador");
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");

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
    }));

    setSuccessMessage("");
  }

  function handleSubmit(event) {
    event.preventDefault();

    const validationErrors = validateForm(form);

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setSuccessMessage("");
      return;
    }

    setSuccessMessage(
      "Dados validados com sucesso! A integração do cadastro será realizada em uma próxima Sprint.",
    );
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
                accountType === "criador" ? "is-selected" : ""
              }`}
              onClick={() => handleAccountType("criador")}
              aria-pressed={accountType === "criador"}
            >
              Criador
            </button>

            <button
              type="button"
              className={`signup-form__account-button ${
                accountType === "visitante" ? "is-selected" : ""
              }`}
              onClick={() => handleAccountType("visitante")}
              aria-pressed={accountType === "visitante"}
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
            {accountType === "criador"
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
              accountType === "criador"
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
            <span
              id="email-error"
              className="signup-form__error"
              role="alert"
            >
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
              errors.confirmPassword
                ? "confirm-password-error"
                : undefined
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
          <p className="signup-form__success" role="status" aria-live="polite">
            {successMessage}
          </p>
        )}

        <div className="signup-form__actions">
          <button type="submit" className="signup-form__submit">
            Criar conta
          </button>

          <p className="signup-form__login">
            Já possui uma conta?{" "}
            <button type="button" disabled>
              Entrar
            </button>
          </p>
        </div>
      </form>
    </main>
  );
}