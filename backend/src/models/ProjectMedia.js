const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const { MEDIA_TYPES } = require('../constants/media');

class ProjectMedia extends Model {}

ProjectMedia.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'project_id',
    },
    url: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    mediaType: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'media_type',
      validate: { isIn: [Object.values(MEDIA_TYPES)] },
    },
    isCover: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_cover',
    },
  },
  {
    sequelize,
    modelName: 'ProjectMedia',
    tableName: 'project_media',
    underscored: true,
    updatedAt: false, // a tabela possui somente created_at
  }
);

module.exports = ProjectMedia;
