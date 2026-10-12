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
          attributes: ['id', 'name', 'email'], // busca só os dados públicos do autor
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
          required: false, // projetos sem capa (ex.: só vídeo) continuam na lista
        },
      ],
      limit: Number(limit),
      offset: Number(offset),
      order: [['created_at', 'DESC']],
      distinct: true, // Garante que a contagem seja correta mesmo com includes
    });

    // Formata o retorno: tecnologias como array de strings e a capa como coverUrl
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
        { model: User, as: 'author', attributes: ['id', 'name'] }, // sem e-mail na página pública
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
        project_id: project.id, // Garante compatibilidade camelCase e snake_case
        name: typeof techName === 'string' ? techName.trim() : techName,
      }));

      await ProjectTechnology.bulkCreate(techRecords, { transaction });
    }

    // 3. Insere os colaboradores
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

    // 4. Insere as mídias (apenas se houver itens no array)
    let mediaRecords = [];
    if (Array.isArray(media) && media.length > 0) {
      const formattedMedia = media.map((item) => ({
        ...item,
        projectId: project.id,
        project_id: project.id,
      }));

      mediaRecords = await ProjectMedia.bulkCreate(formattedMedia, { transaction });
    }

    // 5. Confirma todas as operações
    await transaction.commit();

    return res.status(201).json({
      project: {
        ...project.toJSON(),
        technologies: technologies || [],
        collaborators: collaborators || [],
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
    console.error('>>> ERRO DETALHADO NO CREATE PROJECT:', err);
    next(err);
  }
}
// Edita o projeto e as relações em uma transação única.
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
        await ProjectCollaborator.destroy({ where: { projectId: id }, transaction });
        if (collaborators.length) {
          await ProjectCollaborator.bulkCreate(
            collaborators.map((item) => ({
              projectId: id,
              userId: typeof item === 'string' ? item : item.userId,
              contribution: typeof item === 'string' ? null : (item.contribution || null),
            })),
            { transaction }
          );
        }
      }
      // Campo ausente preserva a galeria; campo presente é a lista final desejada.
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

// Busca contas reais para o seletor de colaboradores.
async function searchCollaborators(req, res, next) {
  try {
    const query = String(req.query.q || '').trim();
    if (query.length < 2) return res.json({ users: [] });
    if (query.length > 100) throw new ApiError(400, 'Pesquisa muito longa.');
    const users = await User.findAll({
      where: { role: ROLES.CREATOR, name: { [likeOperator()]: `%${query}%` } },
      attributes: ['id', 'name'],
      limit: 10,
      order: [['name', 'ASC']],
    });
    return res.json({ users });
  } catch (err) {
    next(err);
  }
}

// Exclusão definitiva nesta primeira entrega; lixeira e restauração são futuras features.
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

module.exports = { list, getById, searchCollaborators, create, update, destroy };
