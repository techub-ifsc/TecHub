'use strict';

// Guardamos somente o hash do link de recuperação. auth_version permite
// invalidar JWTs antigos sem manter uma lista de sessões no banco.
module.exports = {
  async up(queryInterface, Sequelize) {
    if (queryInterface.sequelize.getDialect() !== 'postgres') {
      throw new Error('A migração de redefinição de senha requer PostgreSQL.');
    }
    await queryInterface.sequelize.transaction(async (transaction) => {
      const options = { transaction };
      await queryInterface.addColumn('users', 'password_reset_token_hash', {
        type: Sequelize.STRING(64),
        allowNull: true,
      }, options);
      await queryInterface.addColumn('users', 'password_reset_expires_at', {
        type: Sequelize.DATE,
        allowNull: true,
      }, options);
      await queryInterface.addColumn('users', 'auth_version', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      }, options);
      await queryInterface.addIndex('users', ['password_reset_token_hash'], {
        unique: true,
        name: 'users_password_reset_token_hash_unique',
        transaction,
      });
    });
  },

  async down(queryInterface) {
    // Só com aprovação e backup: o rollback remove links pendentes e o estado
    // usado para invalidar sessões após uma troca de senha.
    await queryInterface.sequelize.transaction(async (transaction) => {
      const options = { transaction };
      await queryInterface.removeIndex('users', 'users_password_reset_token_hash_unique', options);
      await queryInterface.removeColumn('users', 'auth_version', options);
      await queryInterface.removeColumn('users', 'password_reset_expires_at', options);
      await queryInterface.removeColumn('users', 'password_reset_token_hash', options);
    });
  },
};
