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

/**
 * @openapi
 * /projects:
 *   get:
 *     summary: Lista todos os projetos cadastrados
 *     tags:
 *       - Projects
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página para paginação
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Quantidade de projetos por página
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Termo para busca por título
 *       - in: query
 *         name: major
 *         schema:
 *           type: string
 *         description: Filtrar por curso
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filtrar por status
 *     responses:
 *       200:
 *         description: Lista de projetos retornada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   example: 1
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 totalPages:
 *                   type: integer
 *                   example: 1
 *                 projects:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Erro interno do servidor.
 */
router.get('/', projectController.list);

/**
 * @openapi
 * /projects/{id}:
 *   get:
 *     summary: Busca um projeto com tecnologias, colaboradores e mídias
 *     tags:
 *       - Projects
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Projeto encontrado. A mídia de capa vem primeiro.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 project:
 *                   $ref: '#/components/schemas/Project'
 *       404:
 *         description: Projeto não encontrado.
 */
router.get('/:id', projectController.getById);

module.exports = router;