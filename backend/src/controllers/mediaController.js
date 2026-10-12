const { z } = require('zod');
const { ApiError } = require('../middlewares/errorHandler');
const { isCloudinaryConfigured } = require('../config/cloudinary');
const { ALLOWED_MIME_TYPES, MAX_MEDIA_FILE_SIZE } = require('../constants/media');
const { createUploadSignature } = require('../services/mediaStorageService');

const signatureSchema = z.object({
  type: z.enum(Object.keys(ALLOWED_MIME_TYPES), {
    errorMap: () => ({ message: 'Formato não permitido. Use JPG, PNG, WEBP, MP4 ou WEBM.' }),
  }),
  size: z
    .number({ required_error: 'Informe o tamanho do arquivo.' })
    .int()
    .positive('Arquivo vazio.')
    .max(MAX_MEDIA_FILE_SIZE, 'Cada arquivo deve ter no máximo 10 MB.'),
});

// Autoriza o envio de um arquivo direto ao Cloudinary (sem passar pelo servidor,
// que na Vercel limita cada requisição a 4,5 MB). Devolve a URL e os campos assinados.
function signUpload(req, res, next) {
  try {
    if (!isCloudinaryConfigured()) {
      throw new ApiError(503, 'Upload de mídias indisponível no momento.');
    }

    const { type } = signatureSchema.parse(req.body);
    return res.status(201).json(createUploadSignature(type));
  } catch (err) {
    next(err);
  }
}

module.exports = { signUpload };
