import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { resetPassword } from "../api/auth";
import {
  isValidResetToken,
  validateNewPassword,
  validatePasswordConfirmation,
} from "../utils/passwordResetValidation";

import "./LoginPage.css";
import "./PasswordRecoveryPage.css";

const INITIAL_FORM = { password: "", confirmPassword: "" };

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState({});
  const [invalidLink, setInvalidLink] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const hasValidToken = isValidResetToken(token);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "", general: "" }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationErrors = {
      password: validateNewPassword(form.password),
      confirmPassword: validatePasswordConfirmation(form.password, form.confirmPassword),
    };
    setErrors(validationErrors);
    if (validationErrors.password || validationErrors.confirmPassword) return;

    setLoading(true);
    try {
      await resetPassword({ token, ...form });
      setSuccess(true);
      setForm(INITIAL_FORM);
      // O link foi consumido; remove o token do endereço e do histórico atual.
      navigate("/reset-password", { replace: true });
    } catch (error) {
      const response = error.response?.data;
      if (error.response?.status === 400 && response?.errors?.length) {
        const fieldErrors = Object.fromEntries(
          response.errors.map(({ path, message }) => [path, message]),
        );
        if (fieldErrors.token) setInvalidLink(true);
        else setErrors({ ...fieldErrors, general: response.message });
      } else if (
        error.response?.status === 400 &&
        response?.message?.startsWith("Link inválido")
      ) {
        setInvalidLink(true);
      } else {
        setErrors({
          general:
            response?.message ||
            "Não foi possível redefinir sua senha. Tente novamente mais tarde.",
        });
      }
    } finally {
      setLoading(false);
    }
  }

  const fields = [
    { name: "password", label: "Nova senha", autoComplete: "new-password" },
    { name: "confirmPassword", label: "Confirmar nova senha", autoComplete: "new-password" },
  ];

  return (
    <section className="login-page password-page" aria-labelledby="reset-title">
      <h1 id="reset-title" className="login-page__title">Redefinir senha</h1>
      <div className="login-form password-page__card">
        {success ? (
          <div className="password-page__result" role="status">
            <i className="fa-solid fa-circle-check" aria-hidden="true" />
            <h2>Senha alterada</h2>
            <p>
              Sua nova senha já está ativa. Entre novamente na sua conta;
              as sessões anteriores foram encerradas.
            </p>
            <Link className="password-page__primary-link" to="/login">Ir para o login</Link>
          </div>
        ) : !hasValidToken || invalidLink ? (
          <div className="password-page__result" role="alert">
            <i className="fa-solid fa-link-slash" aria-hidden="true" />
            <h2>Link inválido ou expirado</h2>
            <p>
              Este link pode ter expirado, já ter sido usado ou ter sido substituído
              por um pedido mais recente. Solicite um novo para continuar.
            </p>
            <Link className="password-page__primary-link" to="/forgot-password">
              Pedir novo link
            </Link>
          </div>
        ) : (
          <>
            <p className="password-page__intro">
              Crie uma nova senha para sua conta TecHub. O link pode ser usado
              uma única vez.
            </p>
            <form className="password-page__form" onSubmit={handleSubmit} noValidate>
              {fields.map(({ name, label, autoComplete }) => (
                <div className="login-form__field" key={name}>
                  <label htmlFor={`reset-${name}`}>{label}</label>
                  <div className={`login-form__password-wrapper ${errors[name] ? "is-invalid" : ""}`}>
                    <input
                      id={`reset-${name}`}
                      name={name}
                      type={showPassword[name] ? "text" : "password"}
                      value={form[name]}
                      onChange={handleChange}
                      placeholder={name === "password" ? "Digite a nova senha" : "Repita a nova senha"}
                      autoComplete={autoComplete}
                      aria-invalid={Boolean(errors[name])}
                      aria-describedby={errors[name] ? `reset-${name}-error` : undefined}
                      disabled={loading}
                      required
                    />
                    <button
                      type="button"
                      className="login-form__password-toggle"
                      onClick={() => setShowPassword((current) => ({
                        ...current, [name]: !current[name],
                      }))}
                      aria-label={showPassword[name] ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
                      aria-pressed={Boolean(showPassword[name])}
                    >
                      <i className={`fa-solid ${showPassword[name] ? "fa-eye-slash" : "fa-eye"}`} aria-hidden="true" />
                    </button>
                  </div>
                  {errors[name] && (
                    <span id={`reset-${name}-error`} className="login-form__error" role="alert">
                      {errors[name]}
                    </span>
                  )}
                </div>
              ))}
              <p className="login-form__helper">
                Use pelo menos 8 caracteres, com uma letra e um número.
              </p>
              {errors.general && (
                <p className="password-page__error" role="alert">{errors.general}</p>
              )}
              <button className="login-form__submit password-page__submit" type="submit" disabled={loading}>
                {loading ? "Salvando..." : "Salvar nova senha"}
              </button>
            </form>
          </>
        )}
        {!success && (
          <Link className="password-page__back" to="/login">
            <i className="fa-solid fa-arrow-left" aria-hidden="true" />
            Voltar para o login
          </Link>
        )}
      </div>
    </section>
  );
}
