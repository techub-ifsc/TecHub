const sequelize = require('../config/database');
const User = require('./User');
const Project = require('./Project');
const ProjectTechnology = require('./ProjectTechnology');
const ProjectCollaborator = require('./ProjectCollaborator');
const ProjectMedia = require('./ProjectMedia');
const Conversation = require('./Conversation');
const Message = require('./Message');

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

// 5. Chat em Tempo Real (Conversation <-> Message <-> User)
Conversation.belongsTo(User, {
    foreignKey: 'user1_id',
    as: 'user1',
});
Conversation.belongsTo(User, {
    foreignKey: 'user2_id',
    as: 'user2',
});
User.hasMany(Conversation, {
    foreignKey: 'user1_id',
    as: 'initiatedConversations',
});
User.hasMany(Conversation, {
    foreignKey: 'user2_id',
    as: 'receivedConversations',
});

Conversation.hasMany(Message, {
    foreignKey: 'conversation_id',
    as: 'messages',
    onDelete: 'CASCADE',
});
Message.belongsTo(Conversation, {
    foreignKey: 'conversation_id',
    as: 'conversation',
});

Message.belongsTo(User, {
    foreignKey: 'sender_id',
    as: 'sender',
});
Message.belongsTo(User, {
    foreignKey: 'recipient_id',
    as: 'recipient',
});
User.hasMany(Message, {
    foreignKey: 'sender_id',
    as: 'sentMessages',
});
User.hasMany(Message, {
    foreignKey: 'recipient_id',
    as: 'receivedMessages',
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
    Conversation,
    Message,
};