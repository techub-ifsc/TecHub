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
 *   put:
 *     summary: Atualiza um projeto existente
 *     tags:
 *       - Projects
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID do projeto a ser editado
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: Projeto Atualizado
 *               description:
 *                 type: string
 *                 example: Nova descrição detalhada com mais de 20 caracteres sobre o projeto.
 *               major:
 *                 type: string
 *                 enum:
 *                   - Ciência da Computação
 *                   - Técnico em Informática para Internet
 *                   - Técnico em Desenvolvimento de Sistemas
 *                 example: Ciência da Computação
 *               semester:
 *                 type: integer
 *                 example: 6
 *               technologies:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["React", "TypeScript", "PostgreSQL"]
 *               collaborators:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                       format: uuid
 *                     contribution:
 *                       type: string
 *                 example:
 *                   - userId: "e986790f-aa4e-461b-aa8f-145e4b3c17b0"
 *                     contribution: "Desenvolvedor Frontend"
 *               githubURL:
 *                 type: string
 *                 example: https://github.com/techub-ifsc/TecHub
 *               liveURL:
 *                 type: string
 *                 example: https://techub.vercel.app
 *               status:
 *                 type: string
 *                 enum:
 *                   - Em design
 *                   - Em desenvolvimento
 *                   - Concluido
 *                   - Pausado
 *                 example: Concluido
 *     responses:
 *       200:
 *         description: Projeto atualizado com sucesso.
 *       400:
 *         description: Dados de entrada inválidos.
 *       401:
 *         description: Não autenticado.
 *       403:
 *         description: Não autorizado (apenas o dono pode editar).
 *       404:
 *         description: Projeto não encontrado.
 */
router.put('/:id', authenticate, projectController.update);

/**
 * @openapi
 * /projects/{id}:
 *   delete:
 *     summary: Exclui um projeto permanentemente
 *     tags:
 *       - Projects
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID do projeto que será excluído
 *     responses:
 *       200:
 *         description: Projeto excluído com sucesso.
 *       401:
 *         description: Não autenticado. Token ausente ou inválido.
 *       403:
 *         description: Não autorizado. Apenas o proprietário pode excluir.
 *       404:
 *         description: Projeto não encontrado.
 *       500:
 *         description: Erro interno do servidor.
 */
router.delete('/:id', authenticate, projectController.destroy);

module.exports = router;