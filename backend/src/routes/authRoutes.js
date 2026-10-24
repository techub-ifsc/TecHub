const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas tentativas. Tente novamente mais tarde.' },
});

const passwordResetLimiterOptions = {
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas tentativas. Tente novamente mais tarde.' },
};
const forgotPasswordLimiter = rateLimit(passwordResetLimiterOptions);
const resetPasswordLimiter = rateLimit(passwordResetLimiterOptions);

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Cadastra um visitante ou criador no TecHub
 *     description: Exige nome por compatibilidade com a tabela herdada. accountType aceita visitor ou creator; creator exige e-mail institucional. super_admin nunca é criado por esta rota. A resposta contém message e user, sem JWT; o acesso depende da confirmação por e-mail em até 24 horas.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/RegisterInput' }
 *     responses:
 *       201:
 *         description: Conta criada; link de confirmação enviado. Não retorna JWT.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/RegisterResponse' }
 *       400:
 *         description: Campos inválidos, domínio não permitido ou campos extras (incluindo role)
 *       429:
 *         description: Limite de requisições por IP excedido
 *       503:
 *         description: Banco ou envio de e-mail indisponível
 *       409:
 *         description: E-mail já cadastrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/register', authLimiter, authController.register);

/**
 * @openapi
 * /auth/verify-email:
 *   post:
 *     tags: [Auth]
 *     summary: Confirma o e-mail (ou o novo e-mail pedido no perfil) com token de uso único válido por 24 horas
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string, description: Token recebido no link de e-mail }
 *     responses:
 *       200:
 *         description: E-mail confirmado; usuário pode fazer login
 *       400:
 *         description: Token inválido, expirado ou já usado
 *       409:
 *         description: O novo e-mail passou a ser usado por outra conta; nada foi alterado
 *       429:
 *         description: Limite de requisições por IP excedido
 */
router.post('/verify-email', authLimiter, authController.verifyEmail);

/**
 * @openapi
 * /auth/resend-verification:
 *   post:
 *     tags: [Auth]
 *     summary: Solicita outro link de confirmação
 *     description: Resposta genérica para não revelar se o e-mail possui conta. O link anterior é invalidado.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: Solicitação recebida (resposta igual para e-mail ausente ou já confirmado)
 *       400:
 *         description: E-mail inválido
 *       429:
 *         description: Limite de requisições por IP excedido
 *       503:
 *         description: Serviço de contas ou e-mail indisponível
 */
router.post('/resend-verification', authLimiter, authController.resendVerification);

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Solicita um link de redefinição de senha
 *     description: Resposta igual para e-mail cadastrado ou ausente. O link expira em 1 hora; uma nova solicitação invalida o anterior. Limite de 5 solicitações por IP em 15 minutos.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ForgotPasswordInput' }
 *     responses:
 *       200:
 *         description: Solicitação recebida; não revela se a conta existe
 *       400:
 *         description: E-mail inválido
 *       429:
 *         description: Limite de solicitações excedido
 *       503:
 *         description: Banco ou envio de e-mail indisponível
 */
router.post('/forgot-password', forgotPasswordLimiter, authController.forgotPassword);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Troca a senha com um token de uso único
 *     description: Não inicia sessão. Após o sucesso, os JWTs anteriores são invalidados e a pessoa deve fazer login novamente. Um bloqueio de login por tentativas erradas continua até o prazo terminar.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ResetPasswordInput' }
 *     responses:
 *       200:
 *         description: Senha redefinida; faça login com a nova senha
 *       400:
 *         description: Dados inválidos ou link inválido, expirado ou já usado
 *       429:
 *         description: Limite de tentativas por IP excedido
 *       503:
 *         description: Banco indisponível
 */
router.post('/reset-password', resetPasswordLimiter, authController.resetPassword);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Autentica um usuário e retorna um token JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/LoginInput' }
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthResponse' }
 *       400:
 *         description: E-mail malformado ou senha ausente
 *       429:
 *         description: Limite de tentativas por IP excedido
 *       503:
 *         description: Banco ou tabela de usuários indisponível
 *       401:
 *         description: Credenciais inválidas ou conta bloqueada (15 minutos após 5 falhas). A resposta é a mesma nos dois casos, para não revelar se o e-mail tem conta.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       403:
 *         description: E-mail ainda não confirmado
 */
router.post('/login', authLimiter, authController.login);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Retorna os dados do usuário autenticado
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Usuário autenticado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { $ref: '#/components/schemas/User' }
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: E-mail ainda não confirmado
 */
router.get('/me', authenticate, authController.me);

/**
 * @openapi
 * /auth/me:
 *   patch:
 *     tags: [Auth]
 *     summary: Atualiza nome e/ou senha; um e-mail novo fica em pendingEmail até ser confirmado pelo link
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateProfileInput' }
 *     responses:
 *       200:
 *         description: Perfil atualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { $ref: '#/components/schemas/User' }
 *       401:
 *         description: Senha atual incorreta
 *       409:
 *         description: E-mail já cadastrado
 *       503:
 *         description: O link para o novo e-mail não foi enviado; o e-mail atual não mudou
 */
router.patch('/me', authLimiter, authenticate, authController.updateProfile);

module.exports = router;
