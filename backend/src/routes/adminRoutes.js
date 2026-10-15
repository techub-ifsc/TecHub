const { Router } = require('express');
const adminProjectController = require('../controllers/adminProjectController');
const { authenticate, authorize } = require('../middlewares/auth');
const { ROLES } = require('../constants/roles');

const router = Router();

// Toda a área administrativa exige um super_admin autenticado.
router.use(authenticate, authorize(ROLES.SUPER_ADMIN));

/**
 * @openapi
 * /admin/projects/pending:
 *   get:
 *     summary: Lista os projetos que aguardam moderação
 *     description: O envio mais antigo vem primeiro. dueAt é o fim do prazo de análise (submittedAt + slaDays).
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Fila de moderação com o prazo de análise e os totais por situação.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ModerationList' }
 *       401:
 *         description: Não autenticado.
 *       403:
 *         description: Somente super_admin.
 */
router.get('/projects/pending', adminProjectController.listPending);

/**
 * @openapi
 * /admin/projects:
 *   get:
 *     summary: Lista projetos de qualquer situação na moderação
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, approved, rejected] }
 *         description: Sem o filtro, retorna todas as situações.
 *     responses:
 *       200:
 *         description: Projetos com o parecer da moderação e os totais por situação.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ModerationList' }
 *       400:
 *         description: Situação inválida.
 *       401:
 *         description: Não autenticado.
 *       403:
 *         description: Somente super_admin.
 */
router.get('/projects', adminProjectController.list);

/**
 * @openapi
 * /admin/projects/{id}/approve:
 *   patch:
 *     summary: Aprova um projeto, que passa a aparecer publicamente
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reviewNotes: { type: string, maxLength: 1000, nullable: true, description: Comentário opcional para o criador. }
 *     responses:
 *       200:
 *         description: Projeto aprovado.
 *       401:
 *         description: Não autenticado.
 *       403:
 *         description: Somente super_admin.
 *       404:
 *         description: Projeto não encontrado.
 */
router.patch('/projects/:id/approve', adminProjectController.approve);

/**
 * @openapi
 * /admin/projects/{id}/reject:
 *   patch:
 *     summary: Rejeita um projeto com justificativa obrigatória
 *     description: A justificativa fica salva no projeto e é exibida ao criador. Ao editar o projeto, ele volta para a fila.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reviewNotes]
 *             properties:
 *               reviewNotes: { type: string, minLength: 1, maxLength: 1000, example: Faltou descrever as tecnologias usadas. }
 *     responses:
 *       200:
 *         description: Projeto rejeitado.
 *       400:
 *         description: Justificativa ausente ou longa demais.
 *       401:
 *         description: Não autenticado.
 *       403:
 *         description: Somente super_admin.
 *       404:
 *         description: Projeto não encontrado.
 */
router.patch('/projects/:id/reject', adminProjectController.reject);

module.exports = router;
