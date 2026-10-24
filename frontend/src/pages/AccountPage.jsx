import { useEffect, useState } from "react";

import { useAuth } from "../context/AuthContext";
import {
  accountErrorsFromResponse,
  validateEmailChange,
  validatePasswordChange,
} from "../utils/accountSettings";

import "./LoginPage.css";
import "./PasswordRecoveryPage.css";
import "./AccountPage.css";

const EMPTY_EMAIL_FORM = { email: "", currentPassword: "" };
const EMPTY_PASSWORD_FORM = { currentPassword: "", password: "", confirmPassword: "" };

function PasswordField({ id, label, name, value, error, onChange, autoComplete, disabled }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="login-form__field">
      <label htmlFor={id}>{label}</label>
      <div className={`login-form__password-wrapper ${error ? "is-invalid" : ""}`}>
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          disabled={disabled}
          required
        />
        <button
          type="button"
          className="login-form__password-toggle"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
          aria-pressed={visible}
        >
          <i className={`fa-solid ${visible ? "fa-eye-slash" : "fa-eye"}`} aria-hidden="true" />
        </button>
      </div>
      {error && (
        <span id={`${id}-error`} className="login-form__error" role="alert">{error}</span>
      )}
    </div>
  );
}

export default function AccountPage() {
  const { user, updateProfile, refreshUser } = useAuth();

  const [emailForm, setEmailForm] = useState(EMPTY_EMAIL_FORM);
  const [emailErrors, setEmailErrors] = useState({});
  const [emailSuccess, setEmailSuccess] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD_FORM);
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // A confirmação pode ter acontecido em outra aba: relê a conta ao abrir a página.
  useEffect(() => {
    refreshUser().catch(() => {});
  }, [refreshUser]);

  function handleEmailChange(event) {
    const { name, value } = event.target;
    setEmailForm((current) => ({ ...current, [name]: value }));
    setEmailErrors((current) => ({ ...current, [name]: "", general: "" }));
    setEmailSuccess("");
  }

  function handlePasswordChange(event) {
    const { name, value } = event.target;
    setPasswordForm((current) => ({ ...current, [name]: value }));
    setPasswordErrors((current) => ({ ...current, [name]: "", general: "" }));
    setPasswordSuccess("");
  }

  async function submitEmail(event) {
    event.preventDefault();
    if (savingEmail) return;
    const validationErrors = validateEmailChange(emailForm, user?.email);
    setEmailErrors(validationErrors);
    if (Object.keys(validationErrors).length) return;

    setSavingEmail(true);
    try {
      const { message } = await updateProfile({
        email: emailForm.email.trim().toLowerCase(),
        currentPassword: emailForm.currentPassword,
      });
      setEmailForm(EMPTY_EMAIL_FORM);
      setEmailSuccess(message || "Enviamos um link para o novo e-mail.");
    } catch (error) {
      setEmailErrors(accountErrorsFromResponse(error, ["email", "currentPassword"]));
    } finally {
      setSavingEmail(false);
    }
  }

  async function submitPassword(event) {
    event.preventDefault();
    if (savingPassword) return;
    const validationErrors = validatePasswordChange(passwordForm);
    setPasswordErrors(validationErrors);
    if (Object.keys(validationErrors).length) return;

    setSavingPassword(true);
    try {
      await updateProfile({
        password: passwordForm.password,
        currentPassword: passwordForm.currentPassword,
      });
      setPasswordForm(EMPTY_PASSWORD_FORM);
      setPasswordSuccess("Senha alterada. As outras sessões foram encerradas; esta continua aberta.");
    } catch (error) {
      setPasswordErrors(accountErrorsFromResponse(error, ["password", "currentPassword"]));
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <section className="login-page password-page account-page" aria-labelledby="account-title">
      <h1 id="account-title" className="login-page__title">Minha conta</h1>

      <div className="account-page__cards">
        <form className="login-form password-page__card" onSubmit={submitEmail} noValidate aria-labelledby="account-email-title">
          <div className="account-page__heading">
            <h2 id="account-email-title">E-mail</h2>
            <p>
              Você entra com <strong>{user?.email}</strong>.
            </p>
          </div>

          {user?.pendingEmail && (
            <div className="account-page__notice" role="status">
              <i className="fa-solid fa-envelope-circle-check" aria-hidden="true" />
              <p>
                Falta confirmar <strong>{user.pendingEmail}</strong>: abra o link que enviamos para ele
                (confira também o spam). Até lá, continue entrando com o e-mail atual. Não chegou? Envie o pedido de novo.
              </p>
            </div>
          )}

          <div className="login-form__field">
            <label htmlFor="account-email">Novo e-mail</label>
            <input
              id="account-email"
              name="email"
              type="email"
              value={emailForm.email}
              onChange={handleEmailChange}
              placeholder="voce@email.com"
              autoComplete="email"
              className={emailErrors.email ? "is-invalid" : ""}
              aria-invalid={Boolean(emailErrors.email)}
              aria-describedby={emailErrors.email ? "account-email-error" : undefined}
              disabled={savingEmail}
              required
            />
            {emailErrors.email && (
              <span id="account-email-error" className="login-form__error" role="alert">{emailErrors.email}</span>
            )}
          </div>

          <PasswordField
            id="account-email-current"
            label="Senha atual"
            name="currentPassword"
            value={emailForm.currentPassword}
            error={emailErrors.currentPassword}
            onChange={handleEmailChange}
            autoComplete="current-password"
            disabled={savingEmail}
          />

          <p className="login-form__helper">
            O e-mail só muda depois que você abrir o link enviado para o endereço novo.
          </p>
          {emailErrors.general && <p className="password-page__error" role="alert">{emailErrors.general}</p>}
          {emailSuccess && <p className="account-page__success" role="status">{emailSuccess}</p>}

          <button className="login-form__submit password-page__submit" type="submit" disabled={savingEmail}>
            {savingEmail ? "Enviando..." : "Enviar link de confirmação"}
          </button>
        </form>

        <form className="login-form password-page__card" onSubmit={submitPassword} noValidate aria-labelledby="account-password-title">
          <div className="account-page__heading">
            <h2 id="account-password-title">Senha</h2>
            <p>Ao trocar a senha, as sessões abertas em outros aparelhos são encerradas.</p>
          </div>

          <PasswordField
            id="account-password-current"
            label="Senha atual"
            name="currentPassword"
            value={passwordForm.currentPassword}
            error={passwordErrors.currentPassword}
            onChange={handlePasswordChange}
            autoComplete="current-password"
            disabled={savingPassword}
          />
          <PasswordField
            id="account-password-new"
            label="Nova senha"
            name="password"
            value={passwordForm.password}
            error={passwordErrors.password}
            onChange={handlePasswordChange}
            autoComplete="new-password"
            disabled={savingPassword}
          />
          <PasswordField
            id="account-password-confirm"
            label="Confirmar nova senha"
            name="confirmPassword"
            value={passwordForm.confirmPassword}
            error={passwordErrors.confirmPassword}
            onChange={handlePasswordChange}
            autoComplete="new-password"
            disabled={savingPassword}
          />

          <p className="login-form__helper">Use pelo menos 8 caracteres, com uma letra e um número.</p>
          {passwordErrors.general && <p className="password-page__error" role="alert">{passwordErrors.general}</p>}
          {passwordSuccess && <p className="account-page__success" role="status">{passwordSuccess}</p>}

          <button className="login-form__submit password-page__submit" type="submit" disabled={savingPassword}>
            {savingPassword ? "Salvando..." : "Salvar nova senha"}
          </button>
        </form>
      </div>
    </section>
  );
}
