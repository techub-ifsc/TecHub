const { ApiError } = require('../middlewares/errorHandler');
const { isCloudinaryConfigured } = require('../config/cloudinary');
const { ALLOWED_MIME_TYPES } = require('../constants/media');
const { matchesDeclaredType, uploadMedia } = require('../services/mediaStorageService');

// Envia as fotos/vídeos ao storage e devolve as URLs para o cadastro do projeto.
async function upload(req, res, next) {
  try {
    if (!isCloudinaryConfigured()) {
      throw new ApiError(503, 'Upload de mídias indisponível no momento.');
    }

    const files = req.files || [];
    if (files.length === 0) {
      throw new ApiError(400, 'Envie pelo menos um arquivo no campo "files".');
    }

    // Valida todos os arquivos antes de enviar qualquer um, para não deixar uploads pela metade.
    const invalidFile = files.find((file) => !matchesDeclaredType(file.buffer, file.mimetype));
    if (invalidFile) {
      throw new ApiError(400, `O conteúdo de ${invalidFile.originalname} não corresponde ao formato informado.`);
    }

    const media = await Promise.all(
      files.map(async (file) => {
        const mediaType = ALLOWED_MIME_TYPES[file.mimetype];
        const url = await uploadMedia(file.buffer, mediaType);
        return { url, mediaType };
      })
    );

    return res.status(201).json({ media });
  } catch (err) {
    next(err);
  }
}

module.exports = { upload };
