const { DataTypes, Model } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');
const { ROLES } = require('../constants/roles');

class User extends Model {
  // Compara uma senha em texto puro com o hash armazenado no banco.
  async validatePassword(plainPassword) {
    return bcrypt.compare(plainPassword, this.password);
  }

  // Retorna uma representação do usuário sem incluir sua senha.
  toSafeJSON() {
    const { id, name, email, role, github_url, linkedin_url, resume_url, avatar_url, banner_url, bio, major, expected_graduation, createdAt, updatedAt } = this;
   return { id, name, email, role, github_url, linkedin_url, resume_url, avatar_url, banner_url, bio, major, expected_graduation, createdAt, updatedAt };
  }

  // Dados que qualquer visitante pode ver no perfil público: sem e-mail, papel ou datas.
  toPublicProfileJSON() {
    const { id, name, bio, major, expected_graduation, github_url, linkedin_url, resume_url, avatar_url, banner_url } = this;
    return { id, name, bio, major, expected_graduation, github_url, linkedin_url, resume_url, avatar_url, banner_url };
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: { notEmpty: true, len: [1, 100] },
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
      set(value) {
        this.setDataValue('email', String(value).trim().toLowerCase());
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM(...Object.values(ROLES)),
      allowNull: false,
      defaultValue: ROLES.VISITOR,
    },
    github_url: { type: DataTypes.STRING(255), allowNull: true },
    linkedin_url: { type: DataTypes.STRING(255), allowNull: true },
    resume_url: { type: DataTypes.STRING(500), allowNull: true },
    resume_public_id: { type: DataTypes.STRING(255), allowNull: true },
    bio: { type: DataTypes.TEXT, allowNull: true },
    major: { type: DataTypes.STRING(100), allowNull: true },
    expected_graduation: { type: DataTypes.STRING(7), allowNull: true },
    avatar_url: { type: DataTypes.STRING(500), allowNull: true },
    avatar_public_id: { type: DataTypes.STRING(255), allowNull: true },
    banner_url: { type: DataTypes.STRING(500), allowNull: true },
    banner_public_id: { type: DataTypes.STRING(255), allowNull: true },
    // isEmailVerified: {
    //   type: DataTypes.BOOLEAN,
    //   defaultValue: false,
    // },
    // emailVerificationToken: {
    //   type: DataTypes.STRING,
    //   allowNull: true,
    // },
    // emailVerificationExpires: {
    //   type: DataTypes.DATE,
    //   allowNull: true,
    // },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    underscored: true,
    hooks: {
      beforeSave: async (user) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(12);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
    },
  }
);

module.exports = User;
