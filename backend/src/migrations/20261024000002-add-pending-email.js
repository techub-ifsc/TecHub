'use strict';

// Novo e-mail pedido no perfil. Só passa a valer em `email` depois que o link
// enviado a ele for aberto; até lá a conta segue com o e-mail atual.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'pending_email', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'pending_email');
  },
};
