import { useState } from "react";
import { Link } from "react-router-dom";

import { requestPasswordReset } from "../api/auth";
import { validateRecoveryEmail } from "../utils/passwordResetValidation";

import "./LoginPage.css";
import "./PasswordRecoveryPage.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [requestError, setRequestError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const validationError = validateRecoveryEmail(email);
    setEmailError(validationError);
    setRequestError("");
    if (validationError) return;

    setLoading(true);
    try {
      await requestPasswordReset(email.trim().toLowerCase());
      setSuccess(true);
    } catch (error) {
      setRequestError(
        error.response?.data?.message ||
          "Não foi possível solicitar o link. Tente novamente mais tarde.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="login-page password-page" aria-labelledby="forgot-title">
      <h1 id="forgot-title" className="login-page__title">Esqueceu sua senha?</h1>
      <div className="login-form password-page__card">
        {success ? (
          <div className="password-page__result" role="status">
            <i className="fa-regular fa-envelope" aria-hidden="true" />
            <h2>Confira seu e-mail</h2>
            <p>
              Se existir uma conta para esse endereço, você receberá um link
              para criar uma nova senha. O link vale por 1 hora. Confira também
              a caixa de spam.
            </p>
            <button
              type="button"
              className="password-page__secondary"
              onClick={() => {
                setSuccess(false);
                setEmail("");
              }}
            >
              Usar outro e-mail
            </button>
          </div>
        ) : (
          <>
            <p className="password-page__intro">
              Informe o e-mail da sua conta TecHub. Enviaremos um link para
              você definir uma nova senha.
            </p>
            <form className="password-page__form" onSubmit={handleSubmit} noValidate>
              <div className="login-form__field">
                <label htmlFor="recovery-email">E-mail</label>
                <input
                  id="recovery-email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setEmailError("");
                    setRequestError("");
                  }}
                  placeholder="voce@email.com"
                  autoComplete="email"
                  className={emailError ? "is-invalid" : ""}
                  aria-invalid={Boolean(emailError)}
                  aria-describedby={emailError ? "recovery-email-error" : undefined}
                  disabled={loading}
                  required
                />
                {emailError && (
                  <span id="recovery-email-error" className="login-form__error" role="alert">
                    {emailError}
                  </span>
                )}
              </div>
              {requestError && (
                <p className="password-page__error" role="alert">{requestError}</p>
              )}
              <button className="login-form__submit password-page__submit" type="submit" disabled={loading}>
                {loading ? "Enviando..." : "Enviar link"}
              </button>
            </form>
          </>
        )}
        <Link className="password-page__back" to="/login">
          <i className="fa-solid fa-arrow-left" aria-hidden="true" />
          Voltar para o login
        </Link>
      </div>
    </section>
  );
}
