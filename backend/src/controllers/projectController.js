const { Project, Category, Favorite } = require('../models');
const { createProjectSchema, updateProjectSchema } = require('../validators/projectValidators');
const { ApiError } = require('../middlewares/errorHandler');
const { likeOperator } = require('../utils/db');

// Lista projetos com paginação, busca, categoria e total de favoritos.
async function list(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 100);
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.categoryId) {
      where.categoryId = req.query.categoryId;
    }
    if (req.query.search) {
      where.name = { [likeOperator()]: `%${req.query.search}%` };
    }

    const { rows, count } = await Project.findAndCountAll({
      where,
      include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'slug'] }],
      order: [['createdAt', 'DESC']], 
      limit,
      offset,
    });

    const counts = await Favorite.findAll({
      attributes: ['projectId', [Favorite.sequelize.fn('COUNT', Favorite.sequelize.col('id')), 'count']],
      where: { projectId: rows.map((project) => project.id) },
      group: ['projectId'],
      raw: true,
    });
    const countByProject = Object.fromEntries(counts.map((item) => [item.projectId, Number(item.count)]));

    res.json({
      projects: rows.map((project) => ({ ...project.toJSON(), favoriteCount: countByProject[project.id] || 0 })),
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    });
  } catch (err) {
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
  try {
    const data = createProjectSchema.parse(req.body);
    const project = await Project.create(data);
    res.status(201).json({ project });
  } catch (err) {
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
