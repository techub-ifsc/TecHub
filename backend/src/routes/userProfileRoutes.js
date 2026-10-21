const { Router } = require('express');
const multer = require('multer');
const { authenticate } = require('../middlewares/auth');
const { getMe, updateMe, MAX_RESUME_BYTES } = require('../controllers/userProfileController');
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
