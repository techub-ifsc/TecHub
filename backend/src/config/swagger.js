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
      MediaUploadSignature: {
        type: 'object',
        properties: {
          mediaType: { type: 'string', enum: ['image', 'video'], example: 'image' },
          uploadUrl: { type: 'string', format: 'uri', example: 'https://api.cloudinary.com/v1_1/demo/image/upload' },
          fields: {
            type: 'object',
            description: 'Campos assinados a enviar junto com o arquivo, sem alterações.',
            additionalProperties: true,
          },
        },
      },
      ProjectMediaInput: {
        type: 'object',
        required: ['url', 'mediaType'],
        description: 'secure_url devolvida pelo Cloudinary (envio autorizado por POST /media/signature) ou link do YouTube (mediaType video).',
        properties: {
          url: { type: 'string', format: 'uri', maxLength: 500, example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
          mediaType: { type: 'string', enum: ['image', 'video'], example: 'video' },
          isCover: { type: 'boolean', default: false, description: 'Somente imagens. Sem capa definida, a primeira imagem é usada.' },
        },
      },
      ProjectMedia: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          url: { type: 'string', format: 'uri' },
          mediaType: { type: 'string', enum: ['image', 'video'] },
          isCover: { type: 'boolean' },
        },
      },
      Project: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: 'd3b07384-d113-49cd-a5e6-8149f0ef7771' },
          title: { type: 'string', example: 'Sistema de Gestão Acadêmica' },
          description: { type: 'string', example: 'Plataforma para gerenciamento de projetos e atividades acadêmicas.' },
          major: { type: 'string', nullable: true, example: 'Ciência da Computação' },
          semester: { type: 'integer', example: 4 },
          technologies: {
            type: 'array',
            items: { type: 'string' },
            example: ['React', 'Node.js', 'PostgreSQL'],
          },
          collaborators: {
            type: 'array',
            items: { type: 'string' },
            example: ['Antônio Ferraz', 'Gabriela Rodrigues'],
          },
          githubURL: { type: 'string', format: 'uri', nullable: true, example: 'https://github.com/techub-ifsc/TecHub' },
          liveURL: { type: 'string', format: 'uri', nullable: true, example: 'https://techub.vercel.app' },
          status: { type: 'string', nullable: true, example: 'Em design' },
          media: { type: 'array', items: { $ref: '#/components/schemas/ProjectMedia' } },
          coverUrl: { type: 'string', format: 'uri', nullable: true, description: 'Somente na listagem: URL da imagem de capa.' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateProjectInput: {
        type: 'object',
        required: ['title', 'description', 'media'],
        properties: {
          title: {
            type: 'string',
            minLength: 1,
            maxLength: 100,
            example: 'Sistema de Gestão Acadêmica',
          },
          description: {
            type: 'string',
            minLength: 1,
            maxLength: 500,
            example: 'Plataforma para gerenciamento de projetos e atividades acadêmicas.',
          },
          major: {
            type: 'string',
            nullable: true,
            example: 'Ciência da Computação',
          },
          semester: {
            type: 'integer',
            minimum: 0,
            default: 0,
            example: 4,
          },
          technologies: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            example: ['React', 'Node.js', 'PostgreSQL'],
          },
          collaborators: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            example: ['Antônio Ferraz', 'Gabriela Rodrigues'],
          },
          githubURL: {
            type: 'string',
            format: 'uri',
            maxLength: 100,
            nullable: true,
            example: 'https://github.com/techub-ifsc/TecHub',
          },
          liveURL: {
            type: 'string',
            format: 'uri',
            maxLength: 100,
            nullable: true,
            example: 'https://techub.vercel.app',
          },
          status: {
            type: 'string',
            nullable: true,
            example: 'Em design',
          },
          media: {
            type: 'array',
            minItems: 1,
            maxItems: 10,
            items: { $ref: '#/components/schemas/ProjectMediaInput' },
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
