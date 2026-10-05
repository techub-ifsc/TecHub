const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const { MAJORS } = require('../constants/majors');
const { STATUS } = require('../constants/status');
const ProjectTechnology = require('./ProjectTechnology');
const ProjectCollaborator = require('./ProjectCollaborator');
const ProjectMedia = require('./ProjectMedia');
const User = require('./User');

class Project extends Model { }

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
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: { notEmpty: true, len: [1, 500] },
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
      field: 'github_url', // <-- Força o nome da coluna no PostgreSQL a ser github_url
      validate: { notEmpty: true, len: [1, 100] },
    },
    liveURL: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'live_url', // <-- Força o nome da coluna no PostgreSQL a ser live_url
      validate: { notEmpty: true, len: [1, 100] },
    },
    // pictures
    //videos
    // imageUrl: {
    //   type: DataTypes.STRING(500),
    //   allowNull: true,
    //   field: 'image_url',
    // },

    status: {
      type: DataTypes.ENUM(Object.values(STATUS)),
      allowNull: true,
    },
    ownerId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'owner_id',
    },
  },
  {
    sequelize,
    modelName: 'Project',
    tableName: 'projects',
    underscored: true,
  }
);
Project.hasMany(ProjectTechnology, {
  foreignKey: 'project_id',
  as: 'technologies',
});

Project.hasMany(ProjectCollaborator, {
  foreignKey: 'project_id',
  as: 'collaborators',
});

Project.hasMany(ProjectMedia, {
  foreignKey: 'projectId',
  as: 'media',
Project.belongsTo(User, {
  foreignKey: 'owner_id',
  as: 'author',
});
module.exports = Project;
