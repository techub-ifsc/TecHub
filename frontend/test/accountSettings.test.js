import test from "node:test";
import assert from "node:assert/strict";

import {
  accountErrorsFromResponse,
  validateEmailChange,
  validatePasswordChange,
} from "../src/utils/accountSettings.js";

const apiError = (status, data) => ({ response: { status, data } });

test("troca de e-mail exige e-mail válido, diferente do atual, e a senha atual", () => {
  assert.deepEqual(validateEmailChange({ email: "", currentPassword: "" }, "eu@ifsc.edu.br"), {
    email: "O e-mail é obrigatório.",
    currentPassword: "Digite sua senha atual.",
  });
  assert.match(validateEmailChange({ email: "invalido", currentPassword: "x" }).email, /válido/);
  assert.match(validateEmailChange({ email: " EU@ifsc.edu.br ", currentPassword: "x" }, "eu@ifsc.edu.br").email, /atual/);
  assert.deepEqual(validateEmailChange({ email: "novo@ifsc.edu.br", currentPassword: "x" }, "eu@ifsc.edu.br"), {});
});

test("troca de senha segue a política do backend e pede algo diferente da atual", () => {
  assert.deepEqual(validatePasswordChange({ currentPassword: "", password: "", confirmPassword: "" }), {
    currentPassword: "Digite sua senha atual.",
    password: "A nova senha é obrigatória.",
    confirmPassword: "Confirme a nova senha.",
  });
  assert.match(validatePasswordChange({ currentPassword: "Senha123", password: "Senha123", confirmPassword: "Senha123" }).password, /diferente/);
  assert.match(validatePasswordChange({ currentPassword: "a", password: "curta1", confirmPassword: "curta1" }).password, /8 caracteres/);
  assert.match(validatePasswordChange({ currentPassword: "a", password: "SenhaNova123", confirmPassword: "Outra123" }).confirmPassword, /coincidem/);
  assert.deepEqual(validatePasswordChange({ currentPassword: "Senha123", password: "SenhaNova123", confirmPassword: "SenhaNova123" }), {});
});

test("erros da API vão para o campo certo", () => {
  const emailFields = ["email", "currentPassword"];
  assert.deepEqual(accountErrorsFromResponse(apiError(401, { message: "Senha atual incorreta." }), emailFields),
    { currentPassword: "Senha atual incorreta." });
  assert.match(accountErrorsFromResponse(apiError(401, { message: "Sessão inválida. Entre novamente." }), emailFields).general, /sessão expirou/);
  assert.deepEqual(accountErrorsFromResponse(apiError(409, { message: "Já existe uma conta com este e-mail." }), emailFields),
    { email: "Já existe uma conta com este e-mail." });
  assert.deepEqual(accountErrorsFromResponse(apiError(400, { message: "Contas de criador exigem um destes domínios institucionais: @ifsc.edu.br." }), emailFields),
    { email: "Contas de criador exigem um destes domínios institucionais: @ifsc.edu.br." });
  assert.deepEqual(accountErrorsFromResponse(apiError(400, {
    message: "Dados inválidos.",
    errors: [{ path: "password", message: "A senha deve conter pelo menos um número" }, { path: "name", message: "x" }],
  }), ["password", "currentPassword"]), { password: "A senha deve conter pelo menos um número", general: "x" });
  assert.deepEqual(accountErrorsFromResponse(apiError(503, { message: "O link não foi enviado." }), emailFields),
    { general: "O link não foi enviado." });
  assert.match(accountErrorsFromResponse(new Error("Network Error"), emailFields).general, /Tente novamente/);
});
