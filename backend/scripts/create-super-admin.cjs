// Criação interna: não existe endpoint público para super_admin.
// As credenciais são lidas do ambiente para não aparecerem no histórico do terminal.
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { z } = require('zod');
const { sequelize, User } = require('../src/models');
const { passwordSchema, emailSchema } = require('../src/validators/authValidators');
const { ROLES } = require('../src/constants/roles');

const inputSchema = z.object({
  name: z.string().trim().min(1, 'SUPER_ADMIN_NAME é obrigatório.').max(100),
  email: emailSchema,
  password: passwordSchema,
});

async function main() {
  try {
    const data = inputSchema.parse({
      name: process.env.SUPER_ADMIN_NAME,
      email: process.env.SUPER_ADMIN_EMAIL,
      password: process.env.SUPER_ADMIN_PASSWORD,
    });

    await sequelize.authenticate();

    if (await User.findOne({ where: { email: data.email } })) {
      throw new Error('Já existe uma conta com o e-mail informado.');
    }

    await User.create({ ...data, role: ROLES.SUPER_ADMIN });
    console.log('Conta super_admin criada com sucesso.');
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Dados inválidos:', error.errors.map((item) => item.message).join(' '));
    } else {
      console.error('Não foi possível criar o super_admin:', error.message);
    }
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
