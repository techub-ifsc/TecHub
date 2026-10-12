const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const mediaController = require('../controllers/mediaController');
const { authenticate, authorize } = require('../middlewares/auth');
const { ROLES } = require('../constants/roles');

const router = Router();

// Cada assinatura autoriza um único arquivo; o limite por usuário evita abuso do storage.
const signatureLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user.id,
  message: { message: 'Muitos envios de arquivos. Tente novamente mais tarde.' },
});

/**
 * @openapi
 * /media/signature:
 *   post:
 *     summary: Autoriza o envio de uma foto ou vídeo direto ao Cloudinary (somente criadores)
 *     description: >
 *       Primeira etapa do cadastro com mídias. Para cada arquivo, o frontend pede uma
 *       assinatura e envia o arquivo (campo `file`) junto com `fields` em multipart para
 *       `uploadUrl`. A `secure_url` devolvida pelo Cloudinary deve ser enviada no campo
 *       `media` do `POST /projects`. Formatos: JPG, PNG, WEBP, MP4 e WEBM, até 10 MB.
 *       Imagens são convertidas para webp. A assinatura vale para um único arquivo.
 *     tags:
 *       - Media
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, size]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [image/jpeg, image/png, image/webp, video/mp4, video/webm]
 *                 example: image/png
 *               size:
 *                 type: integer
 *                 description: Tamanho do arquivo em bytes (máximo 10 MB).
 *                 example: 245760
 *     responses:
 *       201:
 *         description: Assinatura criada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MediaUploadSignature'
 *       400:
 *         description: Formato não permitido ou arquivo acima de 10 MB.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Não autenticado. Token ausente ou inválido.
 *       403:
 *         description: Somente criadores podem enviar mídias.
 *       429:
 *         description: Limite de envios atingido.
 *       503:
 *         description: Storage não configurado no servidor.
 */
router.post(
  '/signature',
  authenticate,
  authorize(ROLES.CREATOR),
  signatureLimiter,
  mediaController.signUpload
);

module.exports = router;
