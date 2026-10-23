const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_REGEX = /^[a-f0-9]{64}$/i;

export function validateRecoveryEmail(value) {
  const email = value.trim();
  if (!email) return "O e-mail é obrigatório.";
  if (!EMAIL_REGEX.test(email) || email.length > 255) return "Digite um e-mail válido.";
  return "";
}

export function isValidResetToken(token) {
  return TOKEN_REGEX.test(token || "");
}

export function validateNewPassword(password) {
  if (!password) return "A nova senha é obrigatória.";
  if (password.length < 8) return "A senha deve ter pelo menos 8 caracteres.";
  if (!/\p{L}/u.test(password) || !/[0-9]/.test(password)) {
    return "Use pelo menos uma letra e um número.";
  }
  if (new TextEncoder().encode(password).length > 72) {
    return "A senha deve ter no máximo 72 bytes em UTF-8.";
  }
  return "";
}

export function validatePasswordConfirmation(password, confirmation) {
  if (!confirmation) return "Confirme a nova senha.";
  if (password !== confirmation) return "As senhas não coincidem.";
  return "";
}
