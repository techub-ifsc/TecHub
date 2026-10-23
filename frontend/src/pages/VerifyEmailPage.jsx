import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { resendVerification, verifyEmail } from "../api/auth";
import { isValidVerificationToken } from "../utils/emailVerification";
import { validateRecoveryEmail } from "../utils/passwordResetValidation";

import "./LoginPage.css";
import "./PasswordRecoveryPage.css";
import "./VerifyEmailPage.css";

const LOGIN_MESSAGE = "E-mail confirmado! Agora entre com sua senha.";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";
  const validToken = isValidVerificationToken(token);
  const requestedKey = useRef("");
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState(validToken ? "verifying" : "invalid");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [resendError, setResendError] = useState("");
  const [resendSent, setResendSent] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!validToken) {
      setStatus("invalid");
      return;
    }

    // O React StrictMode executa efeitos duas vezes em desenvolvimento.
    // A chave impede o segundo POST, que tentaria reutilizar o token consumido.
    const key = `${token}:${attempt}`;
    if (requestedKey.current === key) return;
    requestedKey.current = key;
    setStatus("verifying");

    verifyEmail(token)
      .then(() => {
        if (requestedKey.current === key) setStatus("success");
      })
      .catch((error) => {
        if (requestedKey.current !== key) return;
        setStatus(error.response?.status === 400 ? "invalid" : "error");
      });
  }, [token, validToken, attempt]);

  useEffect(() => {
    if (status !== "success") return undefined;
    const timer = window.setTimeout(() => {
      navigate("/login", {
        replace: true,
        state: { accessMessage: LOGIN_MESSAGE },
      });
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [status, navigate]);

  async function handleResend(event) {
    event.preventDefault();
    const validationError = validateRecoveryEmail(email);
    setEmailError(validationError);
    setResendError("");
    if (validationError) return;

    setResending(true);
    try {
      await resendVerification(email.trim().toLowerCase());
      setResendSent(true);
    } catch (error) {
      setResendError(
        error.response?.data?.message ||
          "Não foi possível pedir outro link agora. Tente novamente mais tarde.",
      );
    } finally {
      setResending(false);
    }
  }

  const linkToLogin = (
    <Link
      className={status === "success" ? "password-page__primary-link" : "password-page__back"}
      to="/login"
      replace
      state={status === "success" ? { accessMessage: LOGIN_MESSAGE } : undefined}
    >
      {status !== "success" && <i className="fa-solid fa-arrow-left" aria-hidden="true" />}
      {status === "success" ? "Ir para o login" : "Voltar para o login"}
    </Link>
  );

  return (
    <section className="login-page password-page verify-email-page" aria-labelledby="verify-title">
      <h1 id="verify-title" className="login-page__title">Confirmação de e-mail</h1>
      <div className="login-form password-page__card">
        {status === "verifying" && (
          <div className="password-page__result" role="status" aria-live="polite">
            <i className="fa-solid fa-circle-notch verify-email-page__spinner" aria-hidden="true" />
            <h2>Confirmando seu e-mail</h2>
            <p>Aguarde um instante enquanto validamos o link recebido.</p>
          </div>
        )}

        {status === "success" && (
          <div className="password-page__result" role="status" aria-live="polite">
            <i className="fa-solid fa-circle-check" aria-hidden="true" />
            <h2>E-mail confirmado!</h2>
            <p>Sua conta está ativa. Você será levado ao login para entrar com sua senha.</p>
            {linkToLogin}
          </div>
        )}

        {(status === "invalid" || status === "error") && (
          <div className="verify-email-page__failure">
            <div className="password-page__result" role="alert">
              <i className="fa-solid fa-link-slash verify-email-page__invalid-icon" aria-hidden="true" />
              <h2>{status === "invalid" ? "Link inválido ou expirado" : "Não foi possível confirmar agora"}</h2>
              <p>
                {status === "invalid"
                  ? "O link pode ter expirado, já ter sido usado ou ter sido substituído por outro."
                  : "Houve uma falha na confirmação. Você pode tentar novamente com este link."}
              </p>
              {status === "error" && validToken && (
                <button
                  className="password-page__secondary"
                  type="button"
                  onClick={() => setAttempt((value) => value + 1)}
                >
                  Tentar novamente
                </button>
              )}
            </div>

            {resendSent ? (
              <p className="verify-email-page__resend-result" role="status">
                Se houver uma conta aguardando confirmação para esse endereço,
                um novo link será enviado. Confira também a caixa de spam.
              </p>
            ) : (
              <form className="password-page__form verify-email-page__resend" onSubmit={handleResend} noValidate>
                <h3>Precisa de outro link?</h3>
                <p>Informe o e-mail usado no cadastro para pedir um novo envio.</p>
                <div className="login-form__field">
                  <label htmlFor="verify-resend-email">E-mail do cadastro</label>
                  <input
                    id="verify-resend-email"
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setEmailError("");
                      setResendError("");
                    }}
                    placeholder="voce@email.com"
                    autoComplete="email"
                    className={emailError ? "is-invalid" : ""}
                    aria-invalid={Boolean(emailError)}
                    aria-describedby={emailError ? "verify-resend-error" : undefined}
                    disabled={resending}
                    required
                  />
                  {emailError && (
                    <span id="verify-resend-error" className="login-form__error" role="alert">
                      {emailError}
                    </span>
                  )}
                </div>
                {resendError && <p className="password-page__error" role="alert">{resendError}</p>}
                <button className="login-form__submit password-page__submit" type="submit" disabled={resending}>
                  {resending ? "Enviando..." : "Reenviar confirmação"}
                </button>
              </form>
            )}
            {linkToLogin}
          </div>
        )}
      </div>
    </section>
  );
}
