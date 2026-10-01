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
    const { id, name, email, role, createdAt, updatedAt } = this;
    return { id, name, email, role, createdAt, updatedAt };
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
