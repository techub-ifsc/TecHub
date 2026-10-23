import test from "node:test";
import assert from "node:assert/strict";

import {
  isValidResetToken,
  validateNewPassword,
  validatePasswordConfirmation,
  validateRecoveryEmail,
} from "../src/utils/passwordResetValidation.js";

test("pedido de link exige um e-mail válido", () => {
  assert.match(validateRecoveryEmail("  "), /obrigatório/);
  assert.match(validateRecoveryEmail("invalido"), /válido/);
  assert.equal(validateRecoveryEmail(" VITOR@EXAMPLE.COM "), "");
});

test("link só aceita o formato de token emitido pelo backend", () => {
  assert.equal(isValidResetToken("a".repeat(64)), true);
  assert.equal(isValidResetToken("A".repeat(64)), true);
  assert.equal(isValidResetToken("a".repeat(63)), false);
  assert.equal(isValidResetToken("x".repeat(64)), false);
});

test("nova senha segue a política do backend, inclusive limite em bytes", () => {
  assert.match(validateNewPassword("curta1"), /8 caracteres/);
  assert.match(validateNewPassword("somenteletras"), /letra e um número/);
  assert.match(validateNewPassword("12345678"), /letra e um número/);
  assert.equal(validateNewPassword("SenhaNova123"), "");
  assert.match(validateNewPassword("á".repeat(36) + "1"), /72 bytes/);
});

test("confirmação deve repetir a nova senha", () => {
  assert.match(validatePasswordConfirmation("SenhaNova123", ""), /Confirme/);
  assert.match(validatePasswordConfirmation("SenhaNova123", "SenhaOutra123"), /coincidem/);
  assert.equal(validatePasswordConfirmation("SenhaNova123", "SenhaNova123"), "");
});
