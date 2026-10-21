const { Router } = require('express');
const multer = require('multer');
const { authenticate } = require('../middlewares/auth');
const { getMe, getPublicProfile, updateMe, MAX_RESUME_BYTES } = require('../controllers/userProfileController');
const { ApiError } = require('../middlewares/errorHandler');

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_RESUME_BYTES, files: 1, fields: 8 },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype !== 'application/pdf') return callback(new ApiError(400, 'Somente arquivos PDF são aceitos.'));
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
  upload.single('resume')(req, res, err => {
    if (err) return next(err.code === 'LIMIT_FILE_SIZE'
      ? new ApiError(400, 'O currículo deve ter no máximo 5 MB.')
      : (err.status ? err : new ApiError(400, 'Arquivo ou formulário inválido.')));
    next();
  });
}, updateMe);
module.exports = router;
