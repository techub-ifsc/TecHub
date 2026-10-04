const { Router } = require('express');
const router = Router();
const projectController = require('../controllers/projectController');

const { authenticate } = require('../middlewares/auth');
/**
 * @openapi
 * /projects:
 *   post:
 *     summary: Cadastra um novo projeto
 *     tags:
 *       - Projects
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProjectInput'
 *     responses:
 *       201:
 *         description: Projeto criado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 project:
 *                   $ref: '#/components/schemas/Project'
 *       400:
 *         description: Erro de validação dos dados enviados.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Não autenticado. Token ausente ou inválido.
 */
router.post('/', authenticate, projectController.create);

module.exports = router;