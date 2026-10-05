// Regras de mídia dos projetos, compartilhadas pelo upload e pela validação.
const MEDIA_TYPES = Object.freeze({
  IMAGE: 'image',
  VIDEO: 'video',
});

const MAX_MEDIA_PER_PROJECT = 10;
const MAX_MEDIA_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

// Somente estes formatos são aceitos no upload, mapeados para o tipo salvo no banco.
const ALLOWED_MIME_TYPES = Object.freeze({
  'image/jpeg': MEDIA_TYPES.IMAGE,
  'image/png': MEDIA_TYPES.IMAGE,
  'image/webp': MEDIA_TYPES.IMAGE,
  'video/mp4': MEDIA_TYPES.VIDEO,
  'video/webm': MEDIA_TYPES.VIDEO,
});

// Pasta do bucket onde as mídias de projetos são guardadas.
const MEDIA_STORAGE_FOLDER = 'techub/projects';

module.exports = {
  MEDIA_TYPES,
  MAX_MEDIA_PER_PROJECT,
  MAX_MEDIA_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  MEDIA_STORAGE_FOLDER,
};
