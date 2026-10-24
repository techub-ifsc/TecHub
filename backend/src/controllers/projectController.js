const { z } = require('zod');
const { Op } = require('sequelize');
const { createProjectSchema, updateProjectSchema, draftProjectSchema } = require('../validators/projectValidators');
const ProjectTechnology = require('../models/ProjectTechnology');
const ProjectCollaborator = require('../models/ProjectCollaborator');
const ProjectMedia = require('../models/ProjectMedia');
const User = require('../models/User');
const { ApiError } = require('../middlewares/errorHandler');
const { likeOperator, containsPattern } = require('../utils/db');
const { ROLES } = require('../constants/roles');
const { APPROVAL_STATUS } = require('../constants/approvalStatus');
const Project = require('../models/Project');
const sequelize = require('../config/database');

// Título gravado quando o rascunho é salvo sem nome; não vale como título no envio.
const UNTITLED_DRAFT = 'Projeto sem título';

const LIST_INCLUDE = [
  {
    model: User,
    as: 'author',
    attributes: ['id', 'name', 'avatar_url', 'banner_url'], // a listagem é pública: sem e-mail
  },
  {
    model: ProjectTechnology,
    as: 'technologies',
    attributes: ['name'],
  },
  {
    model: ProjectCollaborator,
    as: 'collaborators',
    attributes: ['userId', 'contribution'],
  },
  {
    model: ProjectMedia,
    as: 'media',
    attributes: ['url'],
    where: { isCover: true },
    required: false,
  },
];

const MAX_PAGE_SIZE = 100;
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).catch(10).transform((value) => Math.min(value, MAX_PAGE_SIZE)),
  search: z.string().trim().max(100).optional().catch(undefined),
  major: z.string().optional().catch(undefined),
  status: z.string().optional().catch(undefined),
});

function formatListItem(project) {
  const { media, ...json } = project.toJSON();
  return {
    ...json,
    technologies: (json.technologies || []).map((t) => t.name),
    coverUrl: media?.[0]?.url ?? null,
  };
}

// Colaborador precisa ser um criador cadastrado; o dono e as repetições ficam de fora.
async function resolveCollaborators(collaborators, ownerId, transaction) {
  const contributionByUser = new Map();
  for (const item of collaborators || []) {
    const userId = typeof item === 'string' ? item : item.userId;
    if (userId === ownerId || contributionByUser.has(userId)) continue;
    contributionByUser.set(userId, typeof item === 'string' ? null : (item.contribution || null));
  }
  if (!contributionByUser.size) return [];

  const creators = await User.findAll({
    where: { id: [...contributionByUser.keys()], role: ROLES.CREATOR },
    attributes: ['id'],
    transaction,
  });
  if (creators.length !== contributionByUser.size) {
    throw new ApiError(400, 'Só criadores cadastrados podem ser colaboradores.');
  }
  return [...contributionByUser].map(([userId, contribution]) => ({ userId, contribution }));
}

async function replaceCollaborators(projectId, collaborators, ownerId, transaction) {
  const records = await resolveCollaborators(collaborators, ownerId, transaction);
  await ProjectCollaborator.destroy({ where: { projectId }, transaction });
  if (records.length) {
    await ProjectCollaborator.bulkCreate(
      records.map((item) => ({ projectId, ...item })),
      { transaction }
    );
  }
}

function isProjectInsider(project, user) {
  if (!user) return false;
  if (user.role === ROLES.SUPER_ADMIN || project.ownerId === user.id) return true;
  return (project.collaborators || []).some((item) => item.userId === user.id);
}

async function list(req, res, next) {
  try {
    const { page, limit, search, major, status } = listQuerySchema.parse(req.query);
    const offset = (page - 1) * limit;

    const where = { approvalStatus: APPROVAL_STATUS.APPROVED };
    if (major) where.major = major;
    if (status) where.status = status;
    if (search) {
      where.title = { [Op.iLike]: containsPattern(search) };
    }

    const { count, rows: projects } = await Project.findAndCountAll({
      where,
      attributes: { exclude: ['reviewNotes'] },
      include: LIST_INCLUDE,
      limit,
      offset,
      order: [['created_at', 'DESC']],
      distinct: true,
    });

    const formattedProjects = projects.map(formatListItem);

    return res.status(200).json({
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
      projects: formattedProjects,
    });
  } catch (err) {
    console.error('>>> ERRO AO LISTAR PROJETOS:', err);
    next(err);
  }
}

async function listMine(req, res, next) {
  try {
    const userId = req.user.id;
    const collaborations = await ProjectCollaborator.findAll({
      where: { userId },
      attributes: ['projectId'],
    });

    const projects = await Project.findAll({
      where: {
        [Op.or]: [
          { ownerId: userId },
          { id: collaborations.map((item) => item.projectId) },
        ],
      },
      include: LIST_INCLUDE,
      order: [['created_at', 'DESC']],
    });

    return res.status(200).json({ projects: projects.map(formatListItem) });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    if (!z.string().uuid().safeParse(req.params.id).success) {
      throw new ApiError(404, 'Projeto não encontrado.');
    }

    const project = await Project.findByPk(req.params.id, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'name'] },
        { model: ProjectTechnology, as: 'technologies', attributes: ['name'] },
        { model: ProjectCollaborator, as: 'collaborators', attributes: ['userId', 'contribution'] },
        { model: ProjectMedia, as: 'media', attributes: ['id', 'url', 'mediaType', 'isCover'] },
      ],
      order: [
        [{ model: ProjectMedia, as: 'media' }, 'is_cover', 'DESC'],
        [{ model: ProjectMedia, as: 'media' }, 'created_at', 'ASC'],
      ],
    });
    if (!project) {
      throw new ApiError(404, 'Projeto não encontrado.');
    }
    const json = project.toJSON();
    const insider = isProjectInsider(json, req.user);
    
    if (json.approvalStatus !== APPROVAL_STATUS.APPROVED && !insider) {
      throw new ApiError(404, 'Projeto não encontrado.');
    }
    if (!insider) delete json.reviewNotes;
    const collaboratorIds = (json.collaborators || []).map((item) => item.userId);
    const users = collaboratorIds.length
      ? await User.findAll({ where: { id: collaboratorIds }, attributes: ['id', 'name'] })
      : [];
    const nameById = new Map(users.map((user) => [user.id, user.name]));
    res.json({
      project: {
        ...json,
        technologies: (json.technologies || []).map((t) => t.name),
        collaborators: (json.collaborators || []).map((item) => ({
          ...item,
          name: nameById.get(item.userId) || 'Colaborador',
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  const transaction = await sequelize.transaction();
  try {
    if (req.body.status === 'Concluido') {
      req.body.status = 'Concluído';
    }
    const data = createProjectSchema.parse(req.body);
    const { technologies, collaborators: requested, media = [], ...projectData } = data;
    const ownerId = req.user?.id || req.userId;
    const collaborators = await resolveCollaborators(requested, ownerId, transaction);

    const project = await Project.create(
      {
        ...projectData,
        ownerId,
        approvalStatus: APPROVAL_STATUS.PENDING,
      },
      { transaction }
    );

    if (Array.isArray(technologies) && technologies.length > 0) {
      const techRecords = technologies.map((techName) => ({
        projectId: project.id,
        project_id: project.id,
        name: typeof techName === 'string' ? techName.trim() : techName,
      }));
      await ProjectTechnology.bulkCreate(techRecords, { transaction });
    }

    if (collaborators.length > 0) {
      await ProjectCollaborator.bulkCreate(
        collaborators.map((item) => ({ projectId: project.id, ...item })),
        { transaction }
      );
    }

    let mediaRecords = [];
    if (Array.isArray(media) && media.length > 0) {
      const formattedMedia = media.map((item) => ({
        ...item,
        projectId: project.id,
        project_id: project.id,
      }));
      mediaRecords = await ProjectMedia.bulkCreate(formattedMedia, { transaction });
    }

    await transaction.commit();
    return res.status(201).json({
      project: {
        ...project.toJSON(),
        technologies: technologies || [],
        collaborators,
        media: (mediaRecords || []).map((m) => ({
          id: m.id,
          url: m.url,
          mediaType: m.mediaType || m.media_type,
          isCover: m.isCover || m.is_cover,
        })),
      },
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    if (!z.string().uuid().safeParse(id).success) {
      throw new ApiError(404, 'Projeto não encontrado.');
    }
    const userId = req.user?.id || req.userId;
    const result = await sequelize.transaction(async (transaction) => {
      const project = await Project.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!project) throw new ApiError(404, 'Projeto não encontrado.');

      const isOwner = project.ownerId === userId;
      const isCollaborator = !isOwner && await ProjectCollaborator.findOne({
        where: { projectId: id, userId }, transaction,
      });
      if (!isOwner && !isCollaborator) {
        throw new ApiError(403, 'Você não tem permissão para editar este projeto.');
      }

      const data = updateProjectSchema.parse(req.body);
      const { technologies, collaborators, media, ...projectData } = data;
      if (!isOwner && collaborators !== undefined) {
        throw new ApiError(403, 'Apenas o proprietário pode gerenciar colaboradores.');
      }

      // Rascunho continua rascunho: só o envio (POST /:id/submit) o leva à moderação, já completo.
      if (project.approvalStatus !== APPROVAL_STATUS.PENDING && project.approvalStatus !== APPROVAL_STATUS.DRAFT) {
        projectData.approvalStatus = APPROVAL_STATUS.PENDING;
        projectData.submittedAt = new Date();
      }

      await project.update(projectData, { transaction });
      if (technologies !== undefined) {
        await ProjectTechnology.destroy({ where: { projectId: id }, transaction });
        if (technologies.length) {
          await ProjectTechnology.bulkCreate(
            technologies.map((name) => ({ projectId: id, name: name.trim() })),
            { transaction }
          );
        }
      }
      if (collaborators !== undefined) {
        await replaceCollaborators(id, collaborators, project.ownerId, transaction);
      }
      
      if (media !== undefined) {
        await ProjectMedia.destroy({ where: { projectId: id }, transaction });
        await ProjectMedia.bulkCreate(
          media.map((item) => ({ ...item, projectId: id })),
          { transaction }
        );
      }

      const updatedProject = await Project.findByPk(id, {
        transaction,
        include: [
          { model: ProjectTechnology, as: 'technologies', attributes: ['name'] },
          { model: ProjectCollaborator, as: 'collaborators', attributes: ['userId', 'contribution'] },
          { model: ProjectMedia, as: 'media', attributes: ['id', 'url', 'mediaType', 'isCover'] },
        ],
        order: [
          [{ model: ProjectMedia, as: 'media' }, 'is_cover', 'DESC'],
          [{ model: ProjectMedia, as: 'media' }, 'created_at', 'ASC'],
        ],
      });
      const json = updatedProject.toJSON();
      return { ...json, technologies: (json.technologies || []).map((t) => t.name) };
    });
    return res.status(200).json({
      message: 'Projeto atualizado com sucesso.',
      project: result,
    });
  } catch (err) {
    next(err);
  }
}

async function searchCollaborators(req, res, next) {
  try {
    const query = String(req.query.q || '').trim();
    if (query.length < 2) return res.json({ users: [] });
    if (query.length > 100) throw new ApiError(400, 'Pesquisa muito longa.');
    const users = await User.findAll({
      where: { role: ROLES.CREATOR, name: { [likeOperator()]: containsPattern(query) } },
      attributes: ['id', 'name'],
      limit: 10,
      order: [['name', 'ASC']],
    });
    return res.json({ users });
  } catch (err) {
    next(err);
  }
}

async function destroy(req, res, next) {
  try {
    const { id } = req.params;
    if (!z.string().uuid().safeParse(id).success) {
      throw new ApiError(404, 'Projeto não encontrado.');
    }
    const userId = req.user?.id || req.userId;
    await sequelize.transaction(async (transaction) => {
      const project = await Project.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!project) throw new ApiError(404, 'Projeto não encontrado.');
      if (project.ownerId !== userId) {
        throw new ApiError(403, 'Apenas o proprietário do projeto pode excluí-lo.');
      }

      await ProjectMedia.destroy({ where: { projectId: id }, transaction });
      await ProjectTechnology.destroy({ where: { projectId: id }, transaction });
      await ProjectCollaborator.destroy({ where: { projectId: id }, transaction });
      await project.destroy({ transaction });
    });

    return res.status(200).json({ message: 'Projeto excluído com sucesso.' });
  } catch (err) {
    next(err);
  }
}

// =========================================================================
// FUNÇÕES DE GERENCIAMENTO DE RASCUNHOS
// =========================================================================

async function createDraft(req, res, next) {
  const transaction = await sequelize.transaction();
  try {
    const ownerId = req.user?.id || req.userId;
    const { technologies, collaborators: requested, media = [], ...projectData } = draftProjectSchema.parse(req.body);
    const collaborators = await resolveCollaborators(requested, ownerId, transaction);

    // Se o título estiver vazio, define um padrão para o banco aceitar
    if (!projectData.title || projectData.title.trim() === '') {
      projectData.title = UNTITLED_DRAFT;
    }

    const project = await Project.create({
      ...projectData,
      ownerId,
      approvalStatus: APPROVAL_STATUS.DRAFT, // Força status como RASCUNHO
    }, { transaction });

    if (Array.isArray(technologies) && technologies.length > 0) {
      const techRecords = technologies.map((tech) => ({ projectId: project.id, project_id: project.id, name: tech.trim() }));
      await ProjectTechnology.bulkCreate(techRecords, { transaction });
    }
    if (collaborators.length > 0) {
      await ProjectCollaborator.bulkCreate(
        collaborators.map((item) => ({ projectId: project.id, ...item })),
        { transaction }
      );
    }
    if (Array.isArray(media) && media.length > 0) {
      const mediaRecords = media.map((item) => ({ ...item, projectId: project.id, project_id: project.id }));
      await ProjectMedia.bulkCreate(mediaRecords, { transaction });
    }
    
    await transaction.commit();
    return res.status(201).json({ message: 'Rascunho salvo', project });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
}

async function listDrafts(req, res, next) {
  try {
    const userId = req.user?.id || req.userId;
    const projects = await Project.findAll({
      where: { ownerId: userId, approvalStatus: APPROVAL_STATUS.DRAFT },
      include: LIST_INCLUDE,
      order: [['created_at', 'DESC']],
    });
    return res.status(200).json({ projects: projects.map(formatListItem) });
  } catch (err) {
    next(err);
  }
}

async function updateDraft(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.userId;
    const result = await sequelize.transaction(async (transaction) => {
      const project = await Project.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!project) throw new ApiError(404, 'Rascunho não encontrado.');
      if (project.ownerId !== userId) throw new ApiError(403, 'Apenas o dono pode editar este rascunho.');
      if (project.approvalStatus !== APPROVAL_STATUS.DRAFT) throw new ApiError(400, 'Este projeto não é mais um rascunho.');

      const { technologies, collaborators, media, ...projectData } = draftProjectSchema.parse(req.body);
      if (!projectData.title || projectData.title.trim() === '') {
        projectData.title = UNTITLED_DRAFT;
      }

      await project.update(projectData, { transaction });

      if (technologies !== undefined) {
        await ProjectTechnology.destroy({ where: { projectId: id }, transaction });
        if (technologies.length) {
          await ProjectTechnology.bulkCreate(technologies.map((name) => ({ projectId: id, project_id: id, name: name.trim() })), { transaction });
        }
      }
      if (collaborators !== undefined) {
        await replaceCollaborators(id, collaborators, project.ownerId, transaction);
      }
      if (media !== undefined) {
        await ProjectMedia.destroy({ where: { projectId: id }, transaction });
        await ProjectMedia.bulkCreate(media.map((item) => ({ ...item, projectId: id, project_id: id })), { transaction });
      }
      return project;
    });
    return res.status(200).json({ message: 'Rascunho atualizado', project: result });
  } catch (err) {
    next(err);
  }
}

// Campos já salvos no rascunho, no formato do corpo da requisição; vazios ficam de fora.
function draftToBody(project) {
  const json = project.toJSON();
  const body = {
    title: json.title === UNTITLED_DRAFT ? null : json.title,
    description: json.description,
    major: json.major,
    semester: json.semester,
    githubURL: json.githubURL,
    liveURL: json.liveURL,
    status: json.status,
    technologies: (json.technologies || []).map((t) => t.name),
    collaborators: (json.collaborators || []).map(({ userId, contribution }) => ({
      userId,
      ...(contribution && { contribution }),
    })),
    media: (json.media || []).map(({ url, mediaType, isCover }) => ({ url, mediaType, isCover })),
  };
  return Object.fromEntries(Object.entries(body).filter(([, value]) => value != null));
}

async function submitDraft(req, res, next) {
  try {
    const { id } = req.params;
    if (!z.string().uuid().safeParse(id).success) {
      throw new ApiError(404, 'Rascunho não encontrado.');
    }
    const userId = req.user?.id || req.userId;

    const result = await sequelize.transaction(async (transaction) => {
      const project = await Project.findByPk(id, {
        transaction,
        // Só a linha do projeto: o PostgreSQL não aceita FOR UPDATE no lado opcional de um LEFT JOIN.
        lock: { level: transaction.LOCK.UPDATE, of: Project },
        include: [
          { model: ProjectTechnology, as: 'technologies', attributes: ['name'] },
          { model: ProjectCollaborator, as: 'collaborators', attributes: ['userId', 'contribution'] },
          { model: ProjectMedia, as: 'media', attributes: ['url', 'mediaType', 'isCover'] },
        ],
      });
      if (!project) throw new ApiError(404, 'Rascunho não encontrado.');
      if (project.ownerId !== userId) throw new ApiError(403, 'Apenas o dono pode submeter este rascunho.');
      if (project.approvalStatus !== APPROVAL_STATUS.DRAFT) throw new ApiError(400, 'Este projeto não é mais um rascunho.');

      // O corpo substitui o que estava salvo, e o resultado precisa estar
      // completo como um projeto novo antes de ir para a moderação.
      const data = createProjectSchema.parse({ ...draftToBody(project), ...req.body });
      const { technologies, collaborators, media, ...projectData } = data;
      projectData.approvalStatus = APPROVAL_STATUS.PENDING; // Muda de Rascunho para Pendente
      projectData.submittedAt = new Date();

      await project.update(projectData, { transaction });

      await ProjectTechnology.destroy({ where: { projectId: id }, transaction });
      if (technologies.length) await ProjectTechnology.bulkCreate(technologies.map((name) => ({ projectId: id, project_id: id, name: name.trim() })), { transaction });
      await replaceCollaborators(id, collaborators, project.ownerId, transaction);
      await ProjectMedia.destroy({ where: { projectId: id }, transaction });
      await ProjectMedia.bulkCreate(media.map((item) => ({ ...item, projectId: id, project_id: id })), { transaction });
      return project;
    });
    return res.status(200).json({ message: 'Rascunho submetido para moderação.', project: result });
  } catch (err) {
    next(err);
  }
}

// Atualização das exportações
module.exports = { 
  list, 
  listMine, 
  getById, 
  searchCollaborators, 
  create, 
  update, 
  destroy,
  createDraft,
  listDrafts,
  updateDraft,
  submitDraft 
};