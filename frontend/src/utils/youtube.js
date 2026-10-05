const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]);
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

// Mesma regra do backend: aceita links watch, youtu.be, shorts e embed.
export function getYoutubeVideoId(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(host)) return null;

  let id = null;
  if (host === "youtu.be") {
    id = url.pathname.split("/")[1];
  } else if (url.pathname === "/watch") {
    id = url.searchParams.get("v");
  } else {
    const [, section, pathId] = url.pathname.split("/");
    if (section === "shorts" || section === "embed") id = pathId;
  }

  return id && VIDEO_ID_PATTERN.test(id) ? id : null;
}
