'use strict';

// Contas antigas continuam ativas. Somente cadastros feitos depois desta
// migração começam sem confirmação de e-mail.
module.exports = {
  async up(queryInterface, Sequelize) {
    if (queryInterface.sequelize.getDialect() !== 'postgres') {
      throw new Error('A migração de confirmação de e-mail requer PostgreSQL.');
    }
    await queryInterface.sequelize.transaction(async (transaction) => {
      const options = { transaction };
      await queryInterface.addColumn('users', 'email_verified_at', {
        type: Sequelize.DATE,
        allowNull: true,
      }, options);
      await queryInterface.addColumn('users', 'email_verification_token_hash', {
        type: Sequelize.STRING(64),
        allowNull: true,
      }, options);
      await queryInterface.addColumn('users', 'email_verification_expires_at', {
        type: Sequelize.DATE,
        allowNull: true,
      }, options);
      await queryInterface.addIndex('users', ['email_verification_token_hash'], {
        unique: true,
        name: 'users_email_verification_token_hash_unique',
        transaction,
      });
      await queryInterface.sequelize.query(
        'UPDATE users SET email_verified_at = CURRENT_TIMESTAMP WHERE email_verified_at IS NULL',
        options
      );
    });
  },

  async down(queryInterface) {
    // O rollback perde o estado de confirmação. Não executar no banco
    // compartilhado sem aprovação e backup da equipe de banco de dados.
    await queryInterface.sequelize.transaction(async (transaction) => {
      const options = { transaction };
      await queryInterface.removeIndex('users', 'users_email_verification_token_hash_unique', options);
      await queryInterface.removeColumn('users', 'email_verification_expires_at', options);
      await queryInterface.removeColumn('users', 'email_verification_token_hash', options);
      await queryInterface.removeColumn('users', 'email_verified_at', options);
    });
  },
};
