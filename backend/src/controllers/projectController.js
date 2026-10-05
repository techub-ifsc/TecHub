const { z } = require('zod');
const { createProjectSchema, updateProjectSchema } = require('../validators/projectValidators');
const ProjectTechnology = require('../models/ProjectTechnology');
const ProjectCollaborator = require('../models/ProjectCollaborator');
const ProjectMedia = require('../models/ProjectMedia');
const { ApiError } = require('../middlewares/errorHandler');
const { likeOperator } = require('../utils/db');
const Project = require('../models/Project');
const sequelize = require('../config/database'); // Ajuste o caminho se seu sequelize vier de ../models/index ou ../config/database

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
          model: ProjectTechnology,
          as: 'technologies',
          attributes: ['name'],
        },
        {
          model: ProjectCollaborator,
          as: 'collaborators',
          attributes: ['userId', 'contribution'],
        },
      ],
      limit: Number(limit),
      offset: Number(offset),
      order: [['created_at', 'DESC']],
      distinct: true, // Garante que a contagem seja correta mesmo com includes
    });

    // Formata o retorno para deixar tecnologias como um array simples de strings
    const formattedProjects = projects.map((p) => {
      const json = p.toJSON();
      return {
        ...json,
        technologies: (json.technologies || []).map((t) => t.name),
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
        { model: ProjectTechnology, as: 'technologies', attributes: ['name'] },
        { model: ProjectCollaborator, as: 'collaborators', attributes: ['userId', 'contribution'] },
        { model: ProjectMedia, as: 'media', attributes: ['id', 'url', 'mediaType', 'isCover'] },
      ],
      // A capa vem primeiro; as demais seguem a ordem de cadastro.
      order: [
        [{ model: ProjectMedia, as: 'media' }, 'is_cover', 'DESC'],
        [{ model: ProjectMedia, as: 'media' }, 'created_at', 'ASC'],
      ],
    });
    if (!project) {
      throw new ApiError(404, 'Projeto não encontrado.');
    }
    const json = project.toJSON();
    res.json({
      project: { ...json, technologies: (json.technologies || []).map((t) => t.name) },
    });
  } catch (err) {
    next(err);
  }
}

// Valida e cadastra um novo projeto.
async function create(req, res, next) {
  const transaction = await sequelize.transaction();

  try {
    const data = createProjectSchema.parse(req.body);
    const { technologies, collaborators, media, ...projectData } = data;

    const ownerId = req.user?.id || req.userId;

    // 1. Cria o registro principal do projeto
    const project = await Project.create(
      {
        ...projectData,
        ownerId,
      },
      { transaction }
    );

    // 2. Insere as tecnologias
    if (Array.isArray(technologies) && technologies.length > 0) {
      const techRecords = technologies.map((techName) => ({
        projectId: project.id,
        name: techName.trim(),
      }));

      await ProjectTechnology.bulkCreate(techRecords, { transaction });
    }

    // 3. Insere os colaboradores
    if (Array.isArray(collaborators) && collaborators.length > 0) {
      const collaboratorRecords = collaborators.map((item) => {
        // Trata caso venha objeto { userId, contribution } ou string com o próprio userId
        const isObject = typeof item === 'object' && item !== null;
        return {
          projectId: project.id,
          userId: isObject ? item.userId : item,
          contribution: isObject ? (item.contribution || null) : null,
        };
      });

      await ProjectCollaborator.bulkCreate(collaboratorRecords, { transaction });
    }

    // 4. Insere as mídias (URLs já enviadas ao storage pelo POST /media/upload)
    const mediaRecords = await ProjectMedia.bulkCreate(
      media.map((item) => ({ ...item, projectId: project.id })),
      { transaction }
    );

    // 5. Confirma todas as operações
    await transaction.commit();

    return res.status(201).json({
      project: {
        ...project.toJSON(),
        technologies: technologies || [],
        collaborators: collaborators || [],
        media: mediaRecords.map(({ id, url, mediaType, isCover }) => ({ id, url, mediaType, isCover })),
      },
    });
  } catch (err) {
    await transaction.rollback();
    console.error('>>> ERRO DETALHADO NO CREATE PROJECT:', err);
    next(err);
  }
}
// Valida e atualiza um produto existente.
async function update(req, res, next) {
  try {
    const data = updateProjectSchema.parse(req.body);
    const project = await Project.findByPk(req.params.id);
    if (!project) {
      throw new ApiError(404, 'Produto não encontrado.');
    }
    await project.update(data);
    res.json({ project });
  } catch (err) {
    next(err);
  }
}

// Exclui o produto informado ou responde 404 quando ele não existe.
async function remove(req, res, next) {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) {
      throw new ApiError(404, 'Produto não encontrado.');
    }
    await project.destroy();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create, update, remove };
