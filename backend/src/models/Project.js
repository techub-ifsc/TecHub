const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const { MAJORS } = require('../constants/majors');
const { STATUS } = require('../constants/status');
const { APPROVAL_STATUS } = require('../constants/approvalStatus');
const ProjectTechnology = require('./ProjectTechnology');
const ProjectCollaborator = require('./ProjectCollaborator');
const ProjectMedia = require('./ProjectMedia');
const User = require('./User');

class Project extends Model {}

Project.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: { notEmpty: true, len: [1, 100] },
    },
    description: {
      type: DataTypes.TEXT, // Permite descrições completas sem estourar o limite de 500 chars
      allowNull: true,
    },
    major: {
      type: DataTypes.ENUM(Object.values(MAJORS)),
      allowNull: true,
    },
    semester: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    githubURL: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'github_url',
      validate: { notEmpty: true, len: [1, 100] },
    },
    liveURL: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'live_url',
      validate: { notEmpty: true, len: [1, 100] },
    },
    status: {
      type: DataTypes.ENUM(Object.values(STATUS)),
      allowNull: true,
    },
    ownerId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'owner_id',
    },
    // Moderação institucional: somente projetos aprovados aparecem publicamente.
    approvalStatus: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: APPROVAL_STATUS.PENDING,
      field: 'approval_status',
      validate: { isIn: [Object.values(APPROVAL_STATUS)] },
    },
    // Início do prazo de análise; reinicia quando um projeto rejeitado é reenviado.
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'submitted_at',
    },
    reviewNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'review_notes',
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'reviewed_at',
    },
  },
  {
    sequelize,
    modelName: 'Project',
    tableName: 'projects',
    underscored: true,
  }
);

// Associações
Project.hasMany(ProjectTechnology, {
  foreignKey: 'project_id',
  as: 'technologies',
});

Project.hasMany(ProjectCollaborator, {
  foreignKey: 'project_id',
  as: 'collaborators',
});

Project.hasMany(ProjectMedia, {
  foreignKey: 'project_id',
  as: 'media',
});

Project.belongsTo(User, {
  foreignKey: 'owner_id',
  as: 'author',
});

module.exports = Project;