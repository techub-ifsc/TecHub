import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import { test } from "node:test";
import { deleteProjectDraft, getProjectDraft, listProjectDrafts, saveProjectDraft } from "../src/api/projectDrafts.js";

test("salva vários rascunhos incompletos sem sobrescrever os anteriores", async () => {
  const first = await saveProjectDraft("multiple", null, { title: "", media: [] });
  const second = await saveProjectDraft("multiple", null, { title: "Outra ideia" });
  assert.notEqual(first.id, second.id);
  assert.equal((await listProjectDrafts("multiple")).length, 2);
});

test("reabrir e atualizar mantém a identidade e a data de criação", async () => {
  const original = await saveProjectDraft("editing", null, { title: "Ideia" });
  const updated = await saveProjectDraft("editing", original.id, { title: "Ideia revisada", tags: ["React"] });
  const loaded = await getProjectDraft("editing", original.id);
  assert.equal(updated.id, original.id);
  assert.equal(updated.createdAt, original.createdAt);
  assert.equal(loaded.title, "Ideia revisada");
  assert.deepEqual(loaded.tags, ["React"]);
  assert.equal((await listProjectDrafts("editing")).length, 1);
});

test("isola a listagem, a leitura e as alterações por proprietário", async () => {
  const draft = await saveProjectDraft("owner", null, { title: "Privado" });
  assert.deepEqual(await listProjectDrafts("another"), []);
  assert.equal(await getProjectDraft("another", draft.id), null);
  await assert.rejects(saveProjectDraft("another", draft.id, { title: "Alterado" }));
  await assert.rejects(deleteProjectDraft("another", draft.id));
  assert.equal((await getProjectDraft("owner", draft.id)).title, "Privado");
});

test("preserva arquivos, capa e links sem upload", async () => {
  const file = new File(["image-content"], "capa.png", { type: "image/png" });
  const draft = await saveProjectDraft("media", null, { media: [
    { kind: "file", file, mediaType: "image", isCover: true },
    { kind: "youtube", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mediaType: "video" },
  ] });
  const loaded = await getProjectDraft("media", draft.id);
  assert.equal(await loaded.media[0].file.text(), "image-content");
  assert.equal(loaded.media[0].isCover, true);
  assert.equal(loaded.media[1].kind, "youtube");
});

test("exclui somente o rascunho selecionado e não o recria por atualização", async () => {
  const first = await saveProjectDraft("deleting", null, { title: "Primeiro" });
  const second = await saveProjectDraft("deleting", null, { title: "Segundo" });
  await deleteProjectDraft("deleting", first.id);
  assert.equal(await getProjectDraft("deleting", first.id), null);
  assert.equal((await getProjectDraft("deleting", second.id)).title, "Segundo");
  await assert.rejects(saveProjectDraft("deleting", first.id, { title: "Recriado" }));
});

test("rejeita acesso sem usuário identificado", async () => {
  await assert.rejects(listProjectDrafts(null));
  await assert.rejects(saveProjectDraft(undefined, null, {}));
});
