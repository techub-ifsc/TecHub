const sequelize = require('../config/database');
const User = require('./User');
const Project = require('./Project');
const ProjectTechnology = require('./ProjectTechnology');
const ProjectCollaborator = require('./ProjectCollaborator');
const ProjectMedia = require('./ProjectMedia');

// ==========================================
// ASSOCIAÇÕES / RELACIONAMENTOS DO TECHUB
// ==========================================

// 1. Autor do Projeto (Project <-> User)
Project.belongsTo(User, {
    foreignKey: 'owner_id',
    as: 'author',
});
User.hasMany(Project, {
    foreignKey: 'owner_id',
    as: 'projects',
});

// 2. Tecnologias do Projeto (Project <-> ProjectTechnology)
Project.hasMany(ProjectTechnology, {
    foreignKey: 'project_id',
    as: 'technologies',
});
ProjectTechnology.belongsTo(Project, {
    foreignKey: 'project_id',
});

// 3. Colaboradores do Projeto (Project <-> ProjectCollaborator <-> User)
Project.hasMany(ProjectCollaborator, {
    foreignKey: 'project_id',
    as: 'collaborators',
});
ProjectCollaborator.belongsTo(Project, {
    foreignKey: 'project_id',
});

ProjectCollaborator.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user',
});
User.hasMany(ProjectCollaborator, {
    foreignKey: 'user_id',
    as: 'collaborations',
});

// 4. Galeria e Mídias do Projeto (Project <-> ProjectMedia)
Project.hasMany(ProjectMedia, {
    foreignKey: 'project_id',
    as: 'media',
});
ProjectMedia.belongsTo(Project, {
    foreignKey: 'project_id',
});

// ==========================================
// EXPORTAÇÃO CENTRALIZADA
// ==========================================
module.exports = {
    sequelize,
    User,
    Project,
    ProjectTechnology,
    ProjectCollaborator,
    ProjectMedia,
};