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
    // A chave da tabela é (project_id, name). Sem o nome na chave, o Sequelize trata
    // as tecnologias de um projeto como uma única linha e devolve só a primeira.
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      primaryKey: true,
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