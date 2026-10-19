// Ainda não existe rota pública de usuários: os criadores são montados a partir
// dos autores dos projetos aprovados, que a listagem pública traz com id e nome.

const CREATOR_COLORS = ["#315b92", "#8b3a57", "#555f68", "#94602e", "#347554", "#65438a", "#356c74", "#775060"];
const MAX_SKILLS = 4;

export function getInitials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

// A mesma pessoa recebe sempre a mesma cor, em qualquer tela.
export function getCreatorColor(id = "") {
  let hash = 0;
  for (const char of String(id)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return CREATOR_COLORS[hash % CREATOR_COLORS.length];
}

// Ordena os valores pela quantidade de vezes que aparecem (empate: ordem alfabética).
function byFrequency(values) {
  const counts = new Map();
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"))
    .map(([value]) => value);
}

// Agrupa os projetos por autor: nome, curso mais frequente, tecnologias mais usadas e total de projetos.
export function buildCreatorsFromProjects(projects = []) {
  const byAuthor = new Map();

  projects.forEach((project) => {
    const author = project?.author;
    if (!author?.id || !author.name) return;
    if (!byAuthor.has(author.id)) byAuthor.set(author.id, { id: author.id, name: author.name, projects: [] });
    byAuthor.get(author.id).projects.push(project);
  });

  return [...byAuthor.values()]
    .map(({ id, name, projects: authored }) => ({
      id,
      name,
      initials: getInitials(name),
      color: getCreatorColor(id),
      course: byFrequency(authored.map((project) => project.major))[0] || "",
      skills: byFrequency(authored.flatMap((project) => project.technologies || [])).slice(0, MAX_SKILLS),
      projectCount: authored.length,
    }))
    .sort((a, b) => b.projectCount - a.projectCount || a.name.localeCompare(b.name, "pt-BR"));
}

export function findCreator(projects, id) {
  return buildCreatorsFromProjects(projects).find((creator) => creator.id === id) || null;
}
