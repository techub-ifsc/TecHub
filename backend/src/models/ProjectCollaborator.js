const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class ProjectCollaborator extends Model {}

ProjectCollaborator.init(
  {
    projectId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: 'project_id',
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: 'user_id',
    },
    contribution: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize,
    modelName: 'ProjectCollaborator',
    tableName: 'project_collaborators',
    underscored: true,
    timestamps: false, // altere para true se a tabela possuir created_at / updated_at no DBeaver
  }
);

module.exports = ProjectCollaborator;