'use strict';

// Previsão de término do curso, no formato "AAAA/S" (ex.: 2027/1). Só adiciona uma
// coluna vazia: contas existentes continuam iguais.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'expected_graduation', {
      type: Sequelize.STRING(7),
      allowNull: true,
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'expected_graduation');
  },
};
