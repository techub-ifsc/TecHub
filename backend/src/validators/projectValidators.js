const { z } = require('zod');

const createProductSchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(5000).optional().nullable(),
  price: z.coerce.number().positive('Preço deve ser positivo'),
  stock: z.coerce.number().int().min(0).default(0),
  imageUrl: z.string().trim().url().max(500).optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
});

const updateProductSchema = createProductSchema.partial();

module.exports = { createProductSchema, updateProductSchema };
