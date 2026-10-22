'use strict';

// Foto de perfil e foto de capa. O banco guarda só a URL pública do arquivo no
// Cloudinary e o identificador usado para apagá-lo quando a pessoa troca a imagem.
const COLUMNS = {
  avatar_url: 500,
  avatar_public_id: 255,
  banner_url: 500,
  banner_public_id: 255,
};

module.exports = {
  async up(queryInterface, Sequelize) {
    for (const [name, length] of Object.entries(COLUMNS)) {
      await queryInterface.addColumn('users', name, { type: Sequelize.STRING(length), allowNull: true });
    }
  },
  async down(queryInterface) {
    for (const name of Object.keys(COLUMNS).reverse()) {
      await queryInterface.removeColumn('users', name);
    }
  },
};
