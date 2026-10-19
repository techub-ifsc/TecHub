import { API_URL } from "./apiUrl";

const PAGE_SIZE = 50;
const MAX_PAGES = 20;

// Busca todos os projetos aprovados, página por página.
export async function fetchAllPublicProjects() {
  const projects = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const response = await fetch(`${API_URL}/projects?page=${page}&limit=${PAGE_SIZE}`);
    if (!response.ok) throw new Error("Erro ao buscar projetos");

    const data = await response.json();
    const items = Array.isArray(data.projects) ? data.projects : [];
    projects.push(...items);

    if (items.length === 0 || page >= (Number(data.totalPages) || 1)) break;
  }

  return projects;
}
