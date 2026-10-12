const { z } = require('zod');
const { createProjectSchema, updateProjectSchema } = require('../validators/projectValidators');
const ProjectTechnology = require('../models/ProjectTechnology');
const ProjectCollaborator = require('../models/ProjectCollaborator');
const ProjectMedia = require('../models/ProjectMedia');
const User = require('../models/User');
const { ApiError } = require('../middlewares/errorHandler');
const { likeOperator } = require('../utils/db');
const { ROLES } = require('../constants/roles');
const Project = require('../models/Project');
const sequelize = require('../config/database');

// Lista projetos com paginação, busca, categoria e total de favoritos.
async function list(req, res, next) {
  try {
    const { page = 1, limit = 10, search, major, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const where = {};
    if (major) where.major = major;
    if (status) where.status = status;
    if (search) {
      const { Op } = require('sequelize');
      where.title = { [Op.iLike]: `%${search}%` };
    }

    const { count, rows: projects } = await Project.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name', 'email'],
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
      ],
      limit: Number(limit),
      offset: Number(offset),
      order: [['created_at', 'DESC']],
      distinct: true,
    });

    const formattedProjects = projects.map((p) => {
      const { media, ...json } = p.toJSON();
      return {
        ...json,
        technologies: (json.technologies || []).map((t) => t.name),
        coverUrl: media?.[0]?.url ?? null,
      };
    });

    return res.status(200).json({
      total: count,
      page: Number(page),
      totalPages: Math.ceil(count / Number(limit)),
      projects: formattedProjects,
    });
  } catch (err) {
    console.error('>>> ERRO AO LISTAR PROJETOS:', err);
    next(err);
  }
}

// Busca um projeto por ID com tecnologias, colaboradores e mídias.
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

// Valida e cadastra um novo projeto.
async function create(req, res, next) {
  const transaction = await sequelize.transaction();

  try {
    if (req.body.status === 'Concluido') {
      req.body.status = 'Concluído';
    }

    const data = createProjectSchema.parse(req.body);
    const { technologies, collaborators, media = [], ...projectData } = data;

    const ownerId = req.user?.id || req.userId;

    const project = await Project.create(
      {
        ...projectData,
        ownerId,
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

    if (Array.isArray(collaborators) && collaborators.length > 0) {
      const collaboratorRecords = collaborators.map((item) => {
        const isObject = typeof item === 'object' && item !== null;
        const targetUserId = isObject ? item.userId : item;
        return {
          projectId: project.id,
          project_id: project.id,
          userId: targetUserId,
          user_id: targetUserId,
          contribution: isObject ? (item.contribution || null) : null,
        };
      });

      await ProjectCollaborator.bulkCreate(collaboratorRecords, { transaction });
    }

    let mediaRecords = [];
    if (Array.isArray(media) && media.length > 0) {
      const formattedMedia = media.map((item) => ({