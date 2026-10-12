export function createRegistrationPayload(form, accountType) {
  return {
    name: form.username,
    email: form.email.trim().toLowerCase(),
    password: form.password,
    accountType,
  };
}
