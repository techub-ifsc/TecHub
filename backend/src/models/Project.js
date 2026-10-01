const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Product extends Model { }

Product.init(
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
      allowNull: false,
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
    technologies: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
    },
    collaborators:
    {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
    },
    githubLink: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: { notEmpty: true, len: [1, 100] },
    },
    demoLink: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: { notEmpty: true, len: [1, 100] },
    },
    // pictures
    //videos

    status: {
      type: DataTypes.ENUM(Object.values(STATUS)),
      allowNull: true,
    },


    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0 },
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
    },
    imageUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'image_url',
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'category_id',
    },
  },
  {
    sequelize,
    modelName: 'Product',
    tableName: 'products',
    underscored: true,
  }
);

module.exports = Product;
