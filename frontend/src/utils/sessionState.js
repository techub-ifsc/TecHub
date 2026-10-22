// Estado de tela guardado só nesta aba (sessionStorage): sobrevive a ir e voltar entre
// páginas, mas some ao fechar a aba. Se o navegador bloquear o armazenamento, a tela
// segue funcionando com os valores padrão.
export function readSessionState(key, fallback) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

export function writeSessionState(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Armazenamento indisponível: apenas não guarda.
  }
}
