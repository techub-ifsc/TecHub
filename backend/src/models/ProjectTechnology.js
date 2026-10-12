const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class ProjectTechnology extends Model {}

ProjectTechnology.init(
  {
    projectId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true, // <-- Marca como parte da chave primária
      field: 'project_id',
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'ProjectTechnology',
    tableName: 'project_technologies',
    underscored: true,
    timestamps: false, // se a tabela não tiver created_at e updated_at
  }
);

module.exports = ProjectTechnology;