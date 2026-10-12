import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import CustomSelect from "../components/CustomSelect";

import { API_URL } from "../api/apiUrl";
import "./ProjectsPage.css";

const COURSES = {
  "Ciência da Computação": 8,
  "Técnico em Informática para Internet": 4,
  "Técnico em Desenvolvimento de Sistemas": 3,
};

const TECHNOLOGIES = [
  "AWS",
  "Back-end",
  "CSS",
  "Data Science",
  "Docker",
  "FastAPI",
  "Firebase",
  "Flutter",
  "Front-end",
  "Full Stack",
  "Git",
  "GitHub",
  "GraphQL",
  "HTML",
  "Java",
  "JavaScript",
  "Laravel",
  "Machine Learning",
  "Mobile",
  "MongoDB",
  "MySQL",
  "Next.js",
  "Node.js",
  "PHP",
  "PostgreSQL",
  "Python",
  "React",
  "React Native",
  "REST API",
  "Spring Boot",
  "Tailwind CSS",
  "TypeScript",
  "Vue.js",
  "Web",
];

const CARD_COLORS = [
  "#c9e2f5",
  "#d7cdf5",
  "#cce9dd",
  "#f4d5c4",
  "#c8e7ca",
  "#f2dfad",
  "#c9d8f2",
  "#e7c8d7",
];

const ITEMS_PER_PAGE = 8;

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedPhase, setSelectedPhase] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagSearch, setTagSearch] = useState("");
  const [tagsOpen, setTagsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const tagsContainerRef = useRef(null);

  // Busca os projetos reais no Backend
  useEffect(() => {
    async function loadProjects() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${API_URL}/projects?limit=100`);

        if (!response.ok) {
          throw new Error("Erro ao carregar lista de projetos.");
        }

        const data = await response.json();
        const rawProjects = Array.isArray(data.projects)
          ? data.projects
          : Array.isArray(data)
          ? data
          : [];

        // Normaliza os dados do banco para o padrão visual esperado pela tela
        const normalized = rawProjects.map((p, index) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          author: p.author?.name || "Estudante IFSC",
          course: p.major || "Geral",
          phase: p.semester ? `${p.semester}ª Fase` : "Fase livre",
          tags: Array.isArray(p.technologies) ? p.technologies : [],
          status: p.status,
          githubURL: p.githubURL || p.github_url,
          liveURL: p.liveURL || p