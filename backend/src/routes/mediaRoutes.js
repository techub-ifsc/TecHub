const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const mediaController = require('../controllers/mediaController');
const { authenticate } = require('../middlewares/auth');
const { uploadMediaFiles } = require('../middlewares/upload');

const router = Router();

// Limita por usuário autenticado para evitar abuso do storage.
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user.id,
  message: { message: 'Muitos envios de arquivos. Tente novamente mais tarde.' },
});

/**
 * @openapi
 * /media/upload:
 *   post:
 *     summary: Envia fotos e vídeos de um projeto para o storage
 *     description: >
 *       Primeira etapa do cadastro com mídias. Devolve as URLs públicas que devem ser
 *       enviadas no campo `media` do `POST /projects`. Formatos aceitos: JPG, PNG, WEBP,
 *       MP4 e WEBM; até 10 arquivos de no máximo 20 MB cada. Imagens são convertidas para webp.
 *     tags:
 *       - Media
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [files]
 *             properties:
 *               files:
 *                 type: array
 *                 maxItems: 10
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Arquivos enviados com sucesso, na mesma ordem do envio.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 media:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UploadedMedia'
 *       400:
 *         description: Arquivo ausente, com formato inválido ou acima do limite.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Não autenticado. Token ausente ou inválido.
 *       429:
 *         description: Limite de envios atingido.
 *       503:
 *         description: Storage não configurado no servidor.
 */
router.post('/upload', authenticate, uploadLimiter, uploadMediaFiles, mediaController.upload);

module.exports = router;
