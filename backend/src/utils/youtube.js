const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be']);
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

// Extrai o ID de um link do YouTube (watch, youtu.be, shorts ou embed) ou retorna null.
function getYoutubeVideoId(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (!YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) return null;

  let id = null;
  if (url.hostname.toLowerCase() === 'youtu.be') {
    id = url.pathname.split('/')[1];
  } else if (url.pathname === '/watch') {
    id = url.searchParams.get('v');
  } else {
    const [, section, pathId] = url.pathname.split('/');
    if (section === 'shorts' || section === 'embed') id = pathId;
  }

  return id && VIDEO_ID_PATTERN.test(id) ? id : null;
}

// Converte qualquer link aceito para o formato canônico salvo no banco.
function normalizeYoutubeUrl(value) {
  const id = getYoutubeVideoId(value);
  return id ? `https://www.youtube.com/watch?v=${id}` : null;
}

module.exports = { getYoutubeVideoId, normalizeYoutubeUrl };
