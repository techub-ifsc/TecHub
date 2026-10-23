'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = {
      github_url: { type: Sequelize.STRING(255), allowNull: true },
      linkedin_url: { type: Sequelize.STRING(255), allowNull: true },
      resume_url: { type: Sequelize.STRING(500), allowNull: true },
      resume_public_id: { type: Sequelize.STRING(255), allowNull: true },
      bio: { type: Sequelize.TEXT, allowNull: true },
      major: { type: Sequelize.STRING(100), allowNull: true },
      semester: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
    };
    for (const [name, definition] of Object.entries(columns)) {
      await queryInterface.addColumn('users', name, definition);
    }
  },
  async down(queryInterface) {
    for (const name of ['semester', 'major', 'bio', 'resume_public_id', 'resume_url', 'linkedin_url', 'github_url']) {
      await queryInterface.removeColumn('users', name);
    }
  },
};
