const { Router } = require('express');
const multer = require('multer');
const { authenticate } = require('../middlewares/auth');
const { getMe, getPublicProfile, updateMe, MAX_PROFILE_FILE_BYTES } = require('../controllers/userProfileController');
const { ApiError } = require('../middlewares/errorHandler');

const router = Router();
// Tipos aceitos em cada campo de arquivo do perfil. O conteúdo é conferido de novo no controller.
const ACCEPTED_TYPES = {
  resume: ['application/pdf'],
  avatar: ['image/jpeg', 'image/png', 'image/webp'],
  banner: ['image/jpeg', 'image/png', 'image/webp'],
};
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PROFILE_FILE_BYTES, files: 3, fields: 12 },
  fileFilter: (_req, file, callback) => {
    const accepted = ACCEPTED_TYPES[file.fieldname];
    if (!accepted) return callback(new ApiError(400, 'Campo de arquivo inválido.'));
    if (!accepted.includes(file.mimetype)) {
      return callback(new ApiError(400, file.fieldname === 'resume'
        ? 'Somente arquivos PDF são aceitos.'
        : 'Use uma imagem JPG, PNG ou WEBP.'));
    }
    callback(null, true);
  },
});
const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     summary: Perfil público de um criador
 *     description: Não exige login. Traz somente nome, bio, curso, links e currículo; nunca o e-mail.
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Perfil encontrado.
 *       404:
 *         description: Não existe criador com esse ID.
 */
// Antes do authenticate: é a única rota pública deste grupo.
router.get(`/:id(${UUID})`, getPublicProfile);

router.use(authenticate);
router.get('/me', getMe);
router.put('/me', (req, res, next) => {
  upload.fields([
    { name: 'resume', maxCount: 1 },
    { name: 'avatar', maxCount: 1 },
    { name: 'banner', maxCount: 1 },
  ])(req, res, err => {
    if (err) return next(err.code === 'LIMIT_FILE_SIZE'
      ? new ApiError(400, 'Cada arquivo deve ter no máximo 5 MB.')
      : (err.status ? err : new ApiError(400, 'Arquivo ou formulário inválido.')));
    next();
  });
}, updateMe);
module.exports = router;
