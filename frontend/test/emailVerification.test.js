import test from "node:test";
import assert from "node:assert/strict";

import { isValidVerificationToken } from "../src/utils/emailVerification.js";

test("aceita somente o token de confirmação emitido pelo backend", () => {
  assert.equal(isValidVerificationToken("a".repeat(64)), true);
  assert.equal(isValidVerificationToken("A".repeat(64)), true);
  assert.equal(isValidVerificationToken("a".repeat(63)), false);
  assert.equal(isValidVerificationToken("g".repeat(64)), false);
  assert.equal(isValidVerificationToken(""), false);
  assert.equal(isValidVerificationToken(null), false);
});
