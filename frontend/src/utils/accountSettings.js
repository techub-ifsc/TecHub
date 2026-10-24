import {
  validateNewPassword,
  validatePasswordConfirmation,
  validateRecoveryEmail,
} from "./passwordResetValidation.js";

// Regras da página Minha conta. As mesmas do backend (PATCH /auth/me), que sempre pede a senha atual.
const WRONG_CURRENT_PASSWORD = "Senha atual incorreta.";

export function validateEmailChange({ email, currentPassword }, currentEmail = "") {
  const errors = {};
  const emailError = validateRecoveryEmail(email);
  if (emailError) errors.email = emailError;
  else if (email.trim().toLowerCase() === currentEmail.trim().toLowerCase()) {
    errors.email = "Esse já é o seu e-mail atual.";
  }
  if (!currentPassword) errors.currentPassword = "Digite sua senha atual.";
  return errors;
}

export function validatePasswordChange({ currentPassword, password, confirmPassword }) {
  const errors = {};
  if (!currentPassword) errors.currentPassword = "Digite sua senha atual.";
  const passwordError = validateNewPassword(password);
  if (passwordError) errors.password = passwordError;
  else if (password === currentPassword) errors.password = "A nova senha deve ser diferente da atual.";
  const confirmationError = validatePasswordConfirmation(password, confirmPassword);
  if (confirmationError) errors.confirmPassword = confirmationError;
  return errors;
}

// Converte o erro da API em mensagens por campo; o que não é de um campo vira a mensagem geral.
export function accountErrorsFromResponse(error, fields) {
  const status = error?.response?.status;
  const data = error?.response?.data || {};
  if (status === 401 && data.message === WRONG_CURRENT_PASSWORD) {
    return { currentPassword: WRONG_CURRENT_PASSWORD };
  }
  if (status === 401) return { general: "Sua sessão expirou. Entre novamente para continuar." };
  if (status === 409 && fields.includes("email")) return { email: data.message };
  if (status === 400 && data.errors?.length) {
    const errors = {};
    data.errors.forEach(({ path, message }) => {
      const key = fields.includes(path) ? path : "general";
      if (!errors[key]) errors[key] = message;
    });
    return errors;
  }
  // Domínio não permitido para criador chega como 400 sem lista de campos.
  if (status === 400 && fields.includes("email") && /domínio/i.test(data.message || "")) {
    return { email: data.message };
  }
  return { general: data.message || "Não foi possível salvar agora. Tente novamente mais tarde." };
}
