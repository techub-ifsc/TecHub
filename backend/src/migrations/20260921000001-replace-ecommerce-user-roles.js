'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect();

    if (dialect === 'postgres') {
      // RENAME VALUE preserva os usuários existentes sem precisar regravá-los.
      await queryInterface.sequelize.query(
        'ALTER TYPE "enum_users_role" RENAME VALUE \'customer\' TO \'visitor\';'
      );
      await queryInterface.sequelize.query(
        'ALTER TYPE "enum_users_role" RENAME VALUE \'seller\' TO \'creator\';'
      );
      await queryInterface.sequelize.query(
        'ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS \'super_admin\';'
      );
      await queryInterface.sequelize.query(
        'ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT \'visitor\';'
      );
      return;
    }

    if (dialect === 'mysql') {
      // Amplia temporariamente o ENUM para que os dados possam ser convertidos.
      await queryInterface.changeColumn('users', 'role', {
        type: Sequelize.ENUM('customer', 'seller', 'visitor', 'creator', 'super_admin'),
        allowNull: false,
        defaultValue: 'visitor',
      });
      await queryInterface.sequelize.query(
        "UPDATE users SET role = 'visitor' WHERE role = 'customer';"
      );
      await queryInterface.sequelize.query(
        "UPDATE users SET role = 'creator' WHERE role = 'seller';"
      );
      await queryInterface.changeColumn('users', 'role', {
        type: Sequelize.ENUM('visitor', 'creator', 'super_admin'),
        allowNull: false,
        defaultValue: 'visitor',
      });
      return;
    }

    throw new Error(`Migração de perfis não implementada para o dialeto ${dialect}.`);
  },

  async down(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect();
    const [admins] = await queryInterface.sequelize.query(
      "SELECT id FROM users WHERE role = 'super_admin' LIMIT 1;"
    );

    // Não fazemos rebaixamento silencioso de uma conta administrativa.
    if (admins.length > 0) {
      throw new Error(
        'Não é possível desfazer a migração enquanto existirem usuários super_admin.'
      );
    }

    if (dialect === 'postgres') {
      await queryInterface.sequelize.transaction(async (transaction) => {
        const options = { transaction };
        await queryInterface.sequelize.query(
          'ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;',
          options
        );
        await queryInterface.sequelize.query(
          'CREATE TYPE "enum_users_role_legacy" AS ENUM (\'customer\', \'seller\');',
          options
        );
        await queryInterface.sequelize.query(
          `ALTER TABLE "users" ALTER COLUMN "role" TYPE "enum_users_role_legacy"
           USING (CASE "role"::text
             WHEN 'visitor' THEN 'customer'
             WHEN 'creator' THEN 'seller'
           END)::"enum_users_role_legacy";`,
          options
        );
        await queryInterface.sequelize.query('DROP TYPE "enum_users_role";', options);
        await queryInterface.sequelize.query(
          'ALTER TYPE "enum_users_role_legacy" RENAME TO "enum_users_role";',
          options
        );
        await queryInterface.sequelize.query(
          'ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT \'customer\';',
          options
        );
      });
      return;
    }

    if (dialect === 'mysql') {
      await queryInterface.changeColumn('users', 'role', {
        type: Sequelize.ENUM('customer', 'seller', 'visitor', 'creator', 'super_admin'),
        allowNull: false,
        defaultValue: 'customer',
      });
      await queryInterface.sequelize.query(
        "UPDATE users SET role = 'customer' WHERE role = 'visitor';"
      );
      await queryInterface.sequelize.query(
        "UPDATE users SET role = 'seller' WHERE role = 'creator';"
      );
      await queryInterface.changeColumn('users', 'role', {
        type: Sequelize.ENUM('customer', 'seller'),
        allowNull: false,
        defaultValue: 'customer',
      });
      return;
    }

    throw new Error(`Reversão de perfis não implementada para o dialeto ${dialect}.`);
  },
};
