import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCreatorsFromProjects, findCreator, getCreatorColor, getInitials } from "../src/utils/creators.js";

const ana = { id: "a1", name: "Ana Souza" };
const beto = { id: "b2", name: "Beto" };

const projects = [
  { id: "p1", author: ana, major: "Ciência da Computação", technologies: ["React", "Node.js"] },
  { id: "p2", author: ana, major: "Ciência da Computação", technologies: ["React", "PostgreSQL"] },
  { id: "p3", author: beto, major: "Técnico em Informática para Internet", technologies: ["HTML"] },
  { id: "p4", author: null, technologies: ["Vue"] },
];

test("agrupa os projetos por autor e ignora projetos sem autor", () => {
  const creators = buildCreatorsFromProjects(projects);
  assert.deepEqual(creators.map((c) => [c.id, c.projectCount]), [["a1", 2], ["b2", 1]]);
});

test("usa o curso mais frequente e as tecnologias mais usadas", () => {
  const creator = findCreator(projects, "a1");
  assert.equal(creator.course, "Ciência da Computação");
  assert.deepEqual(creator.skills, ["React", "Node.js", "PostgreSQL"]);
  assert.equal(creator.initials, "AS");
});

test("criador sem projeto publicado não é encontrado", () => {
  assert.equal(findCreator(projects, "inexistente"), null);
  assert.deepEqual(buildCreatorsFromProjects([]), []);
});

test("iniciais e cor são estáveis", () => {
  assert.equal(getInitials("beto"), "BE");
  assert.equal(getInitials(""), "?");
  assert.equal(getCreatorColor("a1"), getCreatorColor("a1"));
});

test("usa a foto do autor quando ela é https e ignora as demais", () => {
  const withPhoto = [
    { id: "p1", author: { id: "a1", name: "Ana", avatar_url: "javascript:alert(1)" } },
    { id: "p2", author: { id: "a1", name: "Ana", avatar_url: "https://res.cloudinary.com/x/a.webp" } },
    { id: "p3", author: { id: "b2", name: "Beto", avatar_url: "http://exemplo.com/b.png" } },
  ];
  const [ana, beto] = buildCreatorsFromProjects(withPhoto);
  assert.equal(ana.avatarUrl, "https://res.cloudinary.com/x/a.webp");
  assert.equal(beto.avatarUrl, null);
});

test("usa a capa do autor quando ela é https", () => {
  const [ana] = buildCreatorsFromProjects([
    { id: "p1", author: { id: "a1", name: "Ana", banner_url: "https://res.cloudinary.com/x/b.webp" } },
  ]);
  assert.equal(ana.bannerUrl, "https://res.cloudinary.com/x/b.webp");
  const [beto] = buildCreatorsFromProjects([{ id: "p2", author: { id: "b2", name: "Beto", banner_url: "javascript:alert(1)" } }]);
  assert.equal(beto.bannerUrl, null);
});
