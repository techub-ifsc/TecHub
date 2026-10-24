const { z } = require('zod');
const { Op } = require('sequelize');
const Project = require('../models/Project');
const ProjectTechnology = require('../models/ProjectTechnology');
const ProjectCollaborator = require('../models/ProjectCollaborator');
const ProjectMedia = require('../models/ProjectMedia');
const User = require('../models/User');
const { ApiError } = require('../middlewares/errorHandler');
const { APPROVAL_STATUS } = require('../constants/approvalStatus');
const { getModerationSlaDays, getReviewDueDate } = require('../config/moderation');
const { approveProjectSchema, rejectProjectSchema } = require('../validators/projectValidators');

// Mesmo teto usado hoje pelas listagens do frontend; paginar quando o volume crescer.
const MAX_PROJECTS = 100;

// Rascunhos ainda não foram enviados: ficam fora da moderação.
const listQuerySchema = z.object({
  status: z
    .enum([APPROVAL_STATUS.PENDING, APPROVAL_STATUS.APPROVED, APPROVAL_STATUS.REJECTED], {
      errorMap: () => ({ message: 'status deve ser pending, approved ou rejected' }),
    })
    .optional(),
});

// Monta a fila de moderação: projetos completos, prazo de análise e totais por situação.
async function buildModerationList(status) {
  const count = (approvalStatus) => Project.count({ where: { approvalStatus } });

  const [projects, pending, approved, rejected] = await Promise.all([
    Project.findAll({
      where: { approvalStatus: status || { [Op.ne]: APPROVAL_STATUS.DRAFT } },
      include: [
        // A moderação vê o e-mail do autor para poder contatá-lo.
        { model: User, as: 'author', attributes: ['id', 'name', 'email'] },
        { model: ProjectTechnology, as: 'technologies', attributes: ['name'] },
        { model: ProjectCollaborator, as: 'collaborators', attributes: ['userId', 'contribution'] },
        { model: ProjectMedia, as: 'media', attributes: ['id', 'url', 'mediaType', 'isCover'] },
      ],
      // Pendentes: o envio mais antigo primeiro, pois é o que vence antes.
      order: [['submitted_at', status === APPROVAL_STATUS.PENDING ? 'ASC' : 'DESC']],
      limit: MAX_PROJECTS,
    }),
    count(APPROVAL_STATUS.PENDING),
    count(APPROVAL_STATUS.APPROVED),
    count(APPROVAL_STATUS.REJECTED),
  ]);

  const items = projects.map((project) => project.toJSON());
  const collaboratorIds = [
    ...new Set(items.flatMap((item) => (item.collaborators || []).map((c) => c.userId))),
  ];
  const users = collaboratorIds.length
    ? await User.findAll({ where: { id: collaboratorIds }, attributes: ['id', 'name'] })
    : [];
  const nameById = new Map(users.map((user) => [user.id, user.name]));

  return {
    slaDays: getModerationSlaDays(),
    totals: { pending, approved, rejected },
    projects: items.map((item) => ({
      ...item,
      technologies: (item.technologies || []).map((t) => t.name),
      collaborators: (item.collaborators || []).map((c) => ({
        ...c,
        name: nameById.get(c.userId) || 'Colaborador',
      })),
      // A capa vem primeiro, como na página pública do projeto.
      media: [...(item.media || [])].sort((a, b) => Number(b.isCover) - Number(a.isCover)),
      dueAt: getReviewDueDate(item.submittedAt),
    })),
  };
}

// Lista os projetos que aguardam moderação.
async function listPending(req, res, next) {
  try {
    return res.json(await buildModerationList(APPROVAL_STATUS.PENDING));
  } catch (err) {
    next(err);
  }
}

// Lista projetos de qualquer situação; ?status= filtra por pending, approved ou rejected.
async function list(req, res, next) {
  try {
    const { status } = listQuerySchema.parse(req.query);
    return res.json(await buildModerationList(status));
  } catch (err) {
    next(err);
  }
}

// Registra a decisão da moderação com o parecer e a data da análise.
async function review(req, res, next, { approvalStatus, schema, message }) {
  try {
    const { id } = req.params;
    if (!z.string().uuid().safeParse(id).success) {
      throw new ApiError(404, 'Projeto não encontrado.');
    }
    const { reviewNotes } = schema.parse(req.body || {});

    const project = await Project.findByPk(id);
    if (!project) throw new ApiError(404, 'Projeto não encontrado.');
    if (project.approvalStatus === APPROVAL_STATUS.DRAFT) {
      throw new ApiError(400, 'Rascunhos ainda não foram enviados à moderação.');
    }

    await project.update({
      approvalStatus,
      reviewNotes: reviewNotes || null,
      reviewedAt: new Date(),
    });

    return res.json({
      message,
      project: {
        id: project.id,
        approvalStatus: project.approvalStatus,
        reviewNotes: project.reviewNotes,
        reviewedAt: project.reviewedAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

// Aprova o projeto: ele passa a aparecer nas listagens públicas.
function approve(req, res, next) {
  return review(req, res, next, {
    approvalStatus: APPROVAL_STATUS.APPROVED,
    schema: approveProjectSchema,
    message: 'Projeto aprovado com sucesso.',
  });
}

// Rejeita o projeto; a justificativa é obrigatória e fica visível ao criador.
function reject(req, res, next) {
  return review(req, res, next, {
    approvalStatus: APPROVAL_STATUS.REJECTED,
    schema: rejectProjectSchema,
    message: 'Projeto rejeitado.',
  });
}

module.exports = { list, listPending, approve, reject };
