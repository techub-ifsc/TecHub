const { sequelize, Order, OrderItem, CartItem, Product, User } = require('../models');
const { getOrCreateCart } = require('./cartController');
const { createOrderSchema, updateOrderStatusSchema } = require('../validators/orderValidators');
const { ApiError } = require('../middlewares/errorHandler');
const { ROLES } = require('../constants/roles');

// Converte o carrinho em pedido dentro de uma transação e atualiza o estoque.
async function createOrder(req, res, next) {
  try {
    const data = createOrderSchema.parse(req.body);
    const cart = await getOrCreateCart(req.user.id);

    const result = await sequelize.transaction(async (t) => {
      const cartItems = await CartItem.findAll({
        where: { cartId: cart.id },
        transaction: t,
      });

      if (cartItems.length === 0) {
        throw new ApiError(400, 'Carrinho vazio.');
      }

      // Bloqueia os produtos diretamente, sem passar pela junção com cart_items, pois
      // o PostgreSQL rejeita FOR UPDATE no lado anulável de uma junção externa. A
      // ordenação por ID mantém a mesma ordem de bloqueio em compras simultâneas.
      const productIds = [...new Set(cartItems.map((item) => item.productId))].sort();
      const products = await Product.findAll({
        where: { id: productIds },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      const productsById = new Map(products.map((product) => [product.id, product]));

      let total = 0;
      for (const item of cartItems) {
        const product = productsById.get(item.productId);
        if (!product) {
          throw new ApiError(400, 'Um dos produtos do carrinho não existe mais.');
        }
        if (item.quantity > product.stock) {
          throw new ApiError(400, `Estoque insuficiente para "${product.name}".`);
        }
        total += Number(product.price) * item.quantity;
      }

      const order = await Order.create(
        {
          userId: req.user.id,
          status: 'pending',
          total,
          shippingAddress: data.shippingAddress,
        },
        { transaction: t }
      );

      for (const item of cartItems) {
        const product = productsById.get(item.productId);

        await OrderItem.create(
          {
            orderId: order.id,
            productId: product.id,
            productName: product.name,
            quantity: item.quantity,
            unitPrice: product.price,
          },
          { transaction: t }
        );

        await product.decrement('stock', { by: item.quantity, transaction: t });
      }

      await CartItem.destroy({ where: { cartId: cart.id }, transaction: t });

      return order;
    });

    const fullOrder = await Order.findByPk(result.id, {
      include: [{ model: OrderItem, as: 'items' }],
    });

    res.status(201).json({ order: fullOrder });
  } catch (err) {
    next(err);
  }
}

// Lista pedidos conforme o perfil: próprios para visitante e todos para criador/super-admin.
async function listOrders(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const offset = (page - 1) * limit;

    const canSeeAllOrders = [ROLES.CREATOR, ROLES.SUPER_ADMIN].includes(req.user.role);
    const where = canSeeAllOrders ? {} : { userId: req.user.id };

    const { rows, count } = await Order.findAndCountAll({
      where,
      include: [
        { model: OrderItem, as: 'items' },
        { model: User, as: 'buyer', attributes: ['id', 'name', 'email'] },
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    res.json({
      orders: rows,
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    });
  } catch (err) {
    next(err);
  }
}

// Retorna um pedido quando o usuário é seu visitante ou possui perfil elevado.
async function getOrder(req, res, next) {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        { model: OrderItem, as: 'items' },
        { model: User, as: 'buyer', attributes: ['id', 'name', 'email'] },
      ],
    });

    if (!order) {
      throw new ApiError(404, 'Pedido não encontrado.');
    }

    const canSeeAnyOrder = [ROLES.CREATOR, ROLES.SUPER_ADMIN].includes(req.user.role);
    if (!canSeeAnyOrder && order.userId !== req.user.id) {
      throw new ApiError(403, 'Acesso negado a este pedido.');
    }

    res.json({ order });
  } catch (err) {
    next(err);
  }
}

// Valida a transição e atualiza o status de um pedido pelo criador/super-admin.
async function updateStatus(req, res, next) {
  try {
    const data = updateOrderStatusSchema.parse(req.body);
    const order = await Order.findByPk(req.params.id);
    if (!order) {
      throw new ApiError(404, 'Pedido não encontrado.');
    }
    order.status = data.status;
    await order.save();

    const fullOrder = await Order.findByPk(order.id, {
      include: [
        { model: OrderItem, as: 'items' },
        { model: User, as: 'buyer', attributes: ['id', 'name', 'email'] },
      ],
    });

    res.json({ order: fullOrder });
  } catch (err) {
    next(err);
  }
}

module.exports = { createOrder, listOrders, getOrder, updateStatus };
