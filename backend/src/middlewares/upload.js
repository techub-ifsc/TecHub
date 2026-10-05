const multer = require('multer');
const { ApiError } = require('./errorHandler');
const {
  ALLOWED_MIME_TYPES,
  MAX_MEDIA_FILE_SIZE,
  MAX_MEDIA_PER_PROJECT,
} = require('../constants/media');

// Os arquivos ficam somente em memória até serem enviados ao storage; nada é gravado em disco.
const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_MEDIA_FILE_SIZE,
    files: MAX_MEDIA_PER_PROJECT,
    fields: 0,
  },
  fileFilter: (req, file, callback) => {
    if (!ALLOWED_MIME_TYPES[file.mimetype]) {
      return callback(
        new ApiError(400, `Formato não permitido: ${file.originalname}. Use JPG, PNG, WEBP, MP4 ou WEBM.`)
      );
    }
    return callback(null, true);
  },
}).array('files', MAX_MEDIA_PER_PROJECT);

const MULTER_MESSAGES = {
  LIMIT_FILE_SIZE: 'Cada arquivo deve ter no máximo 20 MB.',
  LIMIT_FILE_COUNT: `O limite é de ${MAX_MEDIA_PER_PROJECT} arquivos por envio.`,
  LIMIT_UNEXPECTED_FILE: `Envie os arquivos no campo "files" (máximo de ${MAX_MEDIA_PER_PROJECT}).`,
};

// Recebe os arquivos do campo "files" e converte erros do multer em respostas 400.
function uploadMediaFiles(req, res, next) {
  multerUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return next(new ApiError(400, MULTER_MESSAGES[err.code] || 'Envio de arquivos inválido.'));
    }
    return next(err);
  });
}

module.exports = { uploadMediaFiles };
