const { Product, Category, Favorite } = require('../models');
const { createProductSchema, updateProductSchema } = require('../validators/productValidators');
const { ApiError } = require('../middlewares/errorHandler');
const { likeOperator } = require('../utils/db');

// Lista produtos com paginação, busca, categoria e total de favoritos.
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

    const { rows, count } = await Product.findAndCountAll({
      where,
      include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'slug'] }],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    const counts = await Favorite.findAll({
      attributes: ['productId', [Favorite.sequelize.fn('COUNT', Favorite.sequelize.col('id')), 'count']],
      where: { productId: rows.map((product) => product.id) },
      group: ['productId'],
      raw: true,
    });
    const countByProduct = Object.fromEntries(counts.map((item) => [item.productId, Number(item.count)]));

    res.json({
      products: rows.map((product) => ({ ...product.toJSON(), favoriteCount: countByProduct[product.id] || 0 })),
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    });
  } catch (err) {
    next(err);
  }
}

// Busca um produto por ID com sua categoria e quantidade de favoritos.
async function getById(req, res, next) {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'slug'] }],
    });
    if (!product) {
      throw new ApiError(404, 'Produto não encontrado.');
    }
    const favoriteCount = await Favorite.count({ where: { productId: product.id } });
    res.json({ product: { ...product.toJSON(), favoriteCount } });
  } catch (err) {
    next(err);
  }
}

// Valida e cadastra um novo produto.
async function create(req, res, next) {
  try {
    const data = createProductSchema.parse(req.body);
    const product = await Product.create(data);
    res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
}

// Valida e atualiza um produto existente.
async function update(req, res, next) {
  try {
    const data = updateProductSchema.parse(req.body);
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      throw new ApiError(404, 'Produto não encontrado.');
    }
    await product.update(data);
    res.json({ product });
  } catch (err) {
    next(err);
  }
}

// Exclui o produto informado ou responde 404 quando ele não existe.
async function remove(req, res, next) {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      throw new ApiError(404, 'Produto não encontrado.');
    }
    await product.destroy();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create, update, remove };
