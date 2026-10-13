// Links informados pelo usuário só são exibidos se forem http(s),
// evitando URLs como "javascript:" no href.
export function safeExternalUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}
