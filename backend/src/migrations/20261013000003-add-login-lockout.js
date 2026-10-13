'use strict';

// Os dados de bloqueio pertencem à conta, não ao endereço IP. A equipe de
// banco deve revisar esta migração antes de executá-la no banco compartilhado.
module.exports = {
  async up(queryInterface, Sequelize) {
    if (queryInterface.sequelize.getDialect() !== 'postgres') {
      throw new Error('A migração de bloqueio de login requer PostgreSQL.');
    }
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn('users', 'failed_login_attempts', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      }, { transaction });
      await queryInterface.addColumn('users', 'locked_until', {
        type: Sequelize.DATE,
        allowNull: true,
      }, { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn('users', 'locked_until', { transaction });
      await queryInterface.removeColumn('users', 'failed_login_attempts', { transaction });
    });
  },
};
