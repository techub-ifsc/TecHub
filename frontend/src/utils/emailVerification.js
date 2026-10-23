const VERIFICATION_TOKEN_REGEX = /^[a-f0-9]{64}$/i;

export function isValidVerificationToken(token) {
  return VERIFICATION_TOKEN_REGEX.test(token || "");
}
