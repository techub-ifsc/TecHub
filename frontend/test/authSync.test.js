import test from "node:test";
import assert from "node:assert/strict";

import { userFromStorageChange } from "../src/utils/authSync.js";

test("aba acompanha login, troca de conta e saída feitos em outra aba", () => {
  const criador = { id: "c1", name: "Criador", role: "creator" };

  // Entrou ou trocou de conta em outra aba
  assert.deepEqual(
    userFromStorageChange({ key: "techub_user", newValue: JSON.stringify(criador) }),
    criador
  );
  // Saiu em outra aba
  assert.equal(userFromStorageChange({ key: "techub_user", newValue: null }), null);
  assert.equal(userFromStorageChange({ key: null, newValue: null }), null);
  // Valor corrompido conta como saída
  assert.equal(userFromStorageChange({ key: "techub_user", newValue: "{quebrado" }), null);
  // Outras chaves não mexem na sessão (o token muda antes do usuário)
  assert.equal(userFromStorageChange({ key: "token", newValue: "abc" }), undefined);
  assert.equal(userFromStorageChange({ key: "techub:criadores:filtros", newValue: "{}" }), undefined);
});
