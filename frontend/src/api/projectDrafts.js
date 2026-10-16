// Rascunhos são locais nesta etapa. IndexedDB preserva também os arquivos,
// sem enviá-los ao backend ou ao serviço de mídia antes da submissão.
const DATABASE = "techub-project-drafts";
const STORE = "drafts";

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE, { keyPath: "id" });
      store.createIndex("ownerId", "ownerId");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Feche outras abas do TecHub e tente novamente."));
  });
}

async function transaction(mode, operation) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE, mode);
    let result;
    tx.oncomplete = () => { database.close(); resolve(result); };
    tx.onabort = () => { database.close(); reject(tx.error || new Error("Operação cancelada.")); };
    tx.onerror = () => { /* onabort trata o erro da transação. */ };
    operation(tx.objectStore(STORE), (value) => { result = value; }, tx);
  });
}

function requireOwner(ownerId) {
  if (!ownerId) throw new Error("Entre na sua conta para acessar seus rascunhos.");
  return String(ownerId);
}

export async function listProjectDrafts(ownerId) {
  const owner = requireOwner(ownerId);
  return transaction("readonly", (store, done) => {
    const request = store.index("ownerId").getAll(owner);
    request.onsuccess = () => done(request.result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  });
}

export async function getProjectDraft(ownerId, id) {
  const owner = requireOwner(ownerId);
  return transaction("readonly", (store, done) => {
    const request = store.get(id);
    request.onsuccess = () => done(request.result?.ownerId === owner ? request.result : null);
  });
}

export async function saveProjectDraft(ownerId, id, fields) {
  const owner = requireOwner(ownerId);
  return transaction("readwrite", (store, done, tx) => {
    const persist = (previous) => {
      const now = new Date().toISOString();
      const draft = {
        ...fields,
        id: id || crypto.randomUUID(),
        ownerId: owner,
        createdAt: previous?.createdAt || now,
        updatedAt: now,
      };
      store.put(draft);
      done(draft);
    };
    if (!id) { persist(); return; }
    const request = store.get(id);
    request.onsuccess = () => {
      // Não recria registros excluídos em outra aba nem sobrescreve outro dono.
      if (request.result?.ownerId !== owner) { tx.abort(); return; }
      persist(request.result);
    };
  });
}

export async function deleteProjectDraft(ownerId, id) {
  const owner = requireOwner(ownerId);
  return transaction("readwrite", (store, done, tx) => {
    const request = store.get(id);
    request.onsuccess = () => {
      if (request.result && request.result.ownerId !== owner) { tx.abort(); return; }
      store.delete(id);
      done();
    };
  });
}

export function draftStorageError(error) {
  if (error?.name === "QuotaExceededError") {
    return "O armazenamento deste navegador está cheio. Remova arquivos ou rascunhos antigos e tente novamente.";
  }
  return "Não foi possível acessar os rascunhos neste navegador. Verifique se o armazenamento está permitido e tente novamente.";
}
