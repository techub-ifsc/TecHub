const { z } = require('zod');

// Importe as constantes MAJORS e STATUS se estiverem em outro arquivo,
// ou mantenha os arrays com os valores válidos:
const { MAJORS } = require('../constants/majors');
const { STATUS } = require('../constants/status');
const { MEDIA_TYPES, MAX_MEDIA_PER_PROJECT } = require('../constants/media');
const { isManagedMediaUrl } = require('../services/mediaStorageService');
const { normalizeYoutubeUrl } = require('../utils/youtube');

// Cada mídia precisa ter sido enviada pelo POST /media/upload ou ser um link do YouTube.
const mediaItemSchema = z
  .object({
    url: z.string().trim().url('URL da mídia inválida').max(500),
    mediaType: z.enum(Object.values(MEDIA_TYPES), {
      errorMap: () => ({ message: 'Tipo de mídia deve ser image ou video' }),
    }),
    isCover: z.boolean().default(false),
  })
  .transform((item, ctx) => {
    if (isManagedMediaUrl(item.url, item.mediaType)) return item;

    const youtubeUrl = item.mediaType === MEDIA_TYPES.VIDEO ? normalizeYoutubeUrl(item.url) : null;
    if (youtubeUrl) return { ...item, url: youtubeUrl };

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['url'],
      message: 'A mídia deve ser enviada pela plataforma ou ser um link do YouTube',
    });
    return z.NEVER;
  });

const mediaSchema = z
  .array(mediaItemSchema, { required_error: 'Adicione pelo menos uma imagem ou vídeo' })
  .min(1, 'Adicione pelo menos uma imagem ou vídeo')
  .max(MAX_MEDIA_PER_PROJECT, `O limite é de ${MAX_MEDIA_PER_PROJECT} mídias por projeto`)
  .refine(
    (items) => items.filter((m) => m.isCover).length <= 1,
    'Apenas uma mídia pode ser definida como capa'
  )
  .refine(
    (items) => !items.some((m) => m.mediaType === MEDIA_TYPES.VIDEO && m.isCover),
    'Vídeos não podem ser definidos como capa principal'
  )
  // Por padrão, a primeira imagem vira capa quando nenhuma foi escolhida.
  .transform((items) => {
    if (items.some((m) => m.isCover)) return items;
    const firstImage = items.findIndex((m) => m.mediaType === MEDIA_TYPES.IMAGE);
    return items.map((m, index) => ({ ...m, isCover: index === firstImage }));
  });

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
    .array(
      z.union([
        // Opção 1: Objeto completo com userId e contribution
        z.object({
          userId: z.string().uuid('ID de usuário inválido'),
          contribution: z.string().max(100).optional(),
        }),
        // Opção 2: Apenas o UUID do usuário diretamente como string
        z.string().uuid('ID de usuário inválido'),
      ])
    )
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

  media: mediaSchema,
});

const updateProjectSchema = createProjectSchema.partial();

module.exports = {
  createProjectSchema,
  updateProjectSchema,
};