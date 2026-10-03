const { z } = require('zod');

// Importe as constantes MAJORS e STATUS se estiverem em outro arquivo,
// ou mantenha os arrays com os valores válidos:
// const { MAJORS, STATUS } = require('../constants/projectConstants');

const createProjectSchema = z.object({
  title: z
    .string({ required_error: 'O título é obrigatório' })
    .trim()
    .min(1, 'O título não pode ser vazio')
    .max(100, 'O título deve ter no máximo 100 caracteres'),

  description: z
    .string({ required_error: 'A descrição é obrigatória' })
    .trim()
    .min(1, 'A descrição não pode ser vazia')
    .max(500, 'A descrição deve ter no máximo 500 caracteres'),

  major: z
    .enum(Object.values(MAJORS), {
      errorMap: () => ({ message: 'Curso selecionado inválido' }),
    })
    .optional()
    .nullable(),

  semester: z.coerce
    .number()
    .int('O semestre deve ser um número inteiro')
    .min(0, 'O semestre não pode ser negativo')
    .optional()
    .nullable()
    .default(0),

  technologies: z
    .array(z.string().trim().min(1, 'O nome da tecnologia não pode ser vazio'))
    .optional()
    .nullable()
    .default([]),

  collaborators: z
    .array(z.string().trim().min(1, 'O nome do colaborador não pode ser vazio'))
    .optional()
    .nullable()
    .default([]),

  githubURL: z
    .string()
    .trim()
    .url('O link do GitHub deve ser uma URL válida')
    .max(100, 'O link do GitHub deve ter no máximo 100 caracteres')
    .optional()
    .nullable()
    .or(z.literal('')),

  liveURL: z
    .string()
    .trim()
    .url('O link da demonstração deve ser uma URL válida')
    .max(100, 'O link da demonstração deve ter no máximo 100 caracteres')
    .optional()
    .nullable()
    .or(z.literal('')),

  status: z
    .enum(Object.values(STATUS), {
      errorMap: () => ({ message: 'Status informado inválido' }),
    })
    .optional()
    .nullable(),
});

const updateProjectSchema = createProjectSchema.partial();

module.exports = {
  createProjectSchema,
  updateProjectSchema,
};