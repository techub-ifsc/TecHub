const swaggerJsdoc = require('swagger-jsdoc');

const definition = {
  openapi: '3.0.3',
  info: {
    title: 'Tech Hub API',
    version: '1.0.0',
    description:
      'API REST do Tech Hub (Node.js, Express, Sequelize, PostgreSQL). ' +
      'Autenticação via JWT (`Authorization: Bearer <token>`).',
  },
  servers: [{ url: '/api', description: 'Servidor atual' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                path: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['visitor', 'creator', 'super_admin'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          user: { $ref: '#/components/schemas/User' },
          token: { type: 'string' },
        },
      },
      RegisterResponse: {
        type: 'object',
        required: ['message', 'user'],
        properties: {
          message: { type: 'string' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      RegisterInput: {
        type: 'object',
        required: ['name', 'email', 'password', 'accountType'],
        additionalProperties: false,
        description: 'Cadastro público de visitante ou criador. Criadores precisam usar o domínio institucional configurado pelo backend. super_admin é criado somente pelo script interno da equipe.',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100, example: 'Maria Silva' },
          email: { type: 'string', format: 'email', maxLength: 255, example: 'maria@example.com' },
          password: { type: 'string', format: 'password', minLength: 8, maxLength: 72, description: 'Ao menos uma letra e um número; máximo de 72 bytes UTF-8 (acentos podem ocupar mais de um byte).', example: 'SenhaTeste123' },
          accountType: { type: 'string', enum: ['visitor', 'creator'], example: 'visitor', description: 'Perfil público escolhido no cadastro. Não use role.' },
        },
      },
      LoginInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', format: 'password' },
        },
      },
      UpdateProfileInput: {
        type: 'object',
        required: ['currentPassword'],
        description: 'Ao menos um entre name, email ou password deve ser informado. Um creator deve manter um e-mail do domínio institucional configurado.',
        properties: {
          name: { type: 'string', example: 'Maria Silva' },
          email: { type: 'string', format: 'email', example: 'maria@exemplo.com' },
          password: { type: 'string', format: 'password', minLength: 8, maxLength: 72, description: 'Ao menos uma letra e um número; máximo de 72 bytes UTF-8.', example: 'novaSenhaSegura123' },
          currentPassword: { type: 'string', format: 'password', example: 'senhaSegura123' },
        },
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          slug: { type: 'string' },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          price: { type: 'number', format: 'decimal', example: 199.9 },
          stock: { type: 'integer', example: 42 },
          imageUrl: { type: 'string', format: 'uri', nullable: true },
          categoryId: { type: 'string', format: 'uuid', nullable: true },
          category: { $ref: '#/components/schemas/Category' },
        },
      },
      ProductInput: {
        type: 'object',
        required: ['name', 'price'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          price: { type: 'number', example: 199.9 },
          stock: { type: 'integer', example: 10 },
          imageUrl: { type: 'string', format: 'uri', nullable: true },
          categoryId: { type: 'string', format: 'uuid', nullable: true },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
      CartItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          quantity: { type: 'integer' },
          product: { $ref: '#/components/schemas/Product' },
        },
      },
      Cart: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          items: { type: 'array', items: { $ref: '#/components/schemas/CartItem' } },
          total: { type: 'number' },
        },
      },
      AddCartItemInput: {
        type: 'object',
        required: ['productId'],
        properties: {
          productId: { type: 'string', format: 'uuid' },
          quantity: { type: 'integer', default: 1, example: 1 },
        },
      },
      UpdateCartItemInput: {
        type: 'object',
        required: ['quantity'],
        properties: {
          quantity: { type: 'integer', example: 2 },
        },
      },
      OrderItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          productId: { type: 'string', format: 'uuid' },
          productName: { type: 'string' },
          quantity: { type: 'integer' },
          unitPrice: { type: 'number' },
        },
      },
      Order: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          status: {
            type: 'string',
            enum: ['pending', 'paid', 'shipped', 'delivered', 'cancelled'],
          },
          total: { type: 'number' },
          shippingAddress: { type: 'string' },
          items: { type: 'array', items: { $ref: '#/components/schemas/OrderItem' } },
          buyer: { $ref: '#/components/schemas/User' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateOrderInput: {
        type: 'object',
        required: ['shippingAddress'],
        properties: {
          shippingAddress: { type: 'string', example: 'Rua Exemplo, 123 - Centro, São Paulo - SP, CEP 01000-000' },
        },
      },
      UpdateOrderStatusInput: {
        type: 'object',
        required: ['status'],
        properties: {
          status: {
            type: 'string',
            enum: ['pending', 'paid', 'shipped', 'delivered', 'cancelled'],
          },
        },
      },
    },
  },
};

const options = {
  definition,
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);
