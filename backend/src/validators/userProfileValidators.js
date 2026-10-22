const { z } = require('zod');

// IMPORTANTE: confirme esta relação e a duração de cada curso com a coordenação do IFSC.
// A sprint exige cursos homologados; estes são os três cursos presentes na UI existente.
const COURSE_PHASES = Object.freeze({
  'Ciência da Computação': 8,
  'Técnico em Informática para Internet': 4,
  'Técnico em Desenvolvimento de Sistemas': 4,
});

const professionalUrl = z.string().trim().max(255).refine(value => {
  if (value === '') return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password;
  } catch { return false; }
}, 'Informe uma URL HTTPS válida.').optional().transform(value => value || null);

// Previsão de término: "AAAA/S", com semestre 1 ou 2 e ano até 10 anos à frente.
const expectedGraduation = z.string().trim().refine(value => {
  if (value === '') return true;
  const match = /^(\d{4})\/([12])$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  return year >= 2000 && year <= new Date().getFullYear() + 10;
}, 'Informe a previsão de término no formato AAAA/S, por exemplo 2027/1.').optional().transform(value => value || null);

const profileSchema = z.object({
  name: z.string().trim().min(3, 'Nome deve ter pelo menos 3 caracteres.').max(100, 'Nome deve ter até 100 caracteres.'),
  github_url: professionalUrl,
  linkedin_url: professionalUrl,
  bio: z.string().max(500, 'Bio deve ter até 500 caracteres.').optional().transform(value => value || null),
  expected_graduation: expectedGraduation,
  major: z.string().refine(value => !value || Object.prototype.hasOwnProperty.call(COURSE_PHASES, value), 'Selecione um curso válido.').optional().transform(value => value || null),
  remove_resume: z.enum(['true', 'false']).optional().default('false'),
  remove_avatar: z.enum(['true', 'false']).optional().default('false'),
  remove_banner: z.enum(['true', 'false']).optional().default('false'),
}).strict();

module.exports = { profileSchema, COURSE_PHASES };
