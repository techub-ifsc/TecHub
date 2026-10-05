const { createProjectSchema, updateProjectSchema } = require('../validators/projectValidators');
const ProjectTechnology = require('../models/ProjectTechnology');
const ProjectCollaborator = require('../models/ProjectCollaborator');
const User = require('../models/User');
const { ApiError } = require('../middlewares/errorHandler');
const { likeOperator } = require('../utils/db');
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

// Busca um projeto por ID com sua categoria e quantidade de favoritos.
async function getById(req, res, next) {
  try {
    const project = await Project.findByPk(req.params.id, {
      include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'slug'] }],
    });
    if (!project) {
      throw new ApiError(404, 'Projeto não encontrado.');
    }
    const favoriteCount = await Favorite.count({ where: { projectId: project.id } });
    res.json({ project: { ...project.toJSON(), favoriteCount } });
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
    const { technologies, collaborators, ...projectData } = data;

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

    // 4. Confirma todas as operações
    await transaction.commit();

    return res.status(201).json({
      project: {
        ...project.toJSON(),
        technologies: technologies || [],
        collaborators: collaborators || [],
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
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const userId = req.user?.id || req.userId;

    // 1. Localiza o projeto
    const project = await Project.findByPk(id, { transaction });
    if (!project) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Projeto não encontrado.' });
    }

    // 2. Validação de autorização: Apenas o dono (ou super_admin) pode editar
    if (project.ownerId !== userId && req.user?.role !== 'super_admin') {
      await transaction.rollback();
      return res.status(403).json({ message: 'Você não tem permissão para editar este projeto.' });
    }

    // 3. Valida os dados enviados
    const data = updateProjectSchema.parse(req.body);
    const { technologies, collaborators, ...projectData } = data;

    // 4. Atualiza os dados principais do projeto
    await project.update(projectData, { transaction });

    // 5. Se enviou nova lista de tecnologias, sincroniza (apaga as antigas e insere as novas)
    if (Array.isArray(technologies)) {
      await ProjectTechnology.destroy({
        where: { projectId: project.id },
        transaction,
      });

      if (technologies.length > 0) {
        const techRecords = technologies.map((techName) => ({
          projectId: project.id,
          name: techName.trim(),
        }));
        await ProjectTechnology.bulkCreate(techRecords, { transaction });
      }
    }

    // 6. Se enviou nova lista de colaboradores, sincroniza
    if (Array.isArray(collaborators)) {
      await ProjectCollaborator.destroy({
        where: { projectId: project.id },
        transaction,
      });

      if (collaborators.length > 0) {
        const collaboratorRecords = collaborators.map((item) => {
          const isObject = typeof item === 'object' && item !== null;
          return {
            projectId: project.id,
            userId: isObject ? item.userId : item,
            contribution: isObject ? (item.contribution || null) : null,
          };
        });
        await ProjectCollaborator.bulkCreate(collaboratorRecords, { transaction });
      }
    }

    await transaction.commit();

    // 7. Retorna o projeto atualizado com suas associações
    const updatedProject = await Project.findByPk(project.id, {
      include: [
        { model: ProjectTechnology, as: 'technologies', attributes: ['name'] },
        { model: ProjectCollaborator, as: 'collaborators', attributes: ['userId', 'contribution'] },
      ],
    });

    const json = updatedProject.toJSON();
    return res.status(200).json({
      message: 'Projeto atualizado com sucesso.',
      project: {
        ...json,
        technologies: (json.technologies || []).map((t) => t.name),
      },
    });
  } catch (err) {
    await transaction.rollback();
    console.error('>>> ERRO AO ATUALIZAR PROJETO:', err);
    next(err);
  }
}

// Lembre-se de exportar update junto com create e list:
module.exports = {
  create,
  list,
  update,
};

// Exclui o produto informado ou responde 404 quando ele não existe.
async function destroy(req, res, next) {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const userId = req.user?.id || req.userId;

    const project = await Project.findByPk(id, { transaction });
    if (!project) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Projeto não encontrado.' });
    }

    const ownerId = project.ownerId || project.owner_id;
    if (ownerId !== userId && req.user?.role !== 'super_admin') {
      await transaction.rollback();
      return res.status(403).json({ message: 'Apenas o proprietário do projeto pode excluí-lo.' });
    }

    // Exclui as dependências existentes
    await ProjectTechnology.destroy({
      where: { projectId: project.id },
      transaction,
    });

    await ProjectCollaborator.destroy({
      where: { projectId: project.id },
      transaction,
    });

    // Exclui o projeto principal
    await project.destroy({ transaction });

    await transaction.commit();

    return res.status(200).json({ message: 'Projeto excluído com sucesso.' });
  } catch (err) {
    await transaction.rollback();
    console.error('>>> ERRO AO EXCLUIR PROJETO:', err);
    next(err);
  }
}

module.exports = { list, getById, create, update, destroy };
