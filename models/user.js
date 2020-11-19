'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.Schedule, { foreignKey: 'createdBy' });
      User.hasMany(models.Comment, { foreignKey: 'userId' });
      User.hasMany(models.Availability, { foreignKey: 'userId' });
    }
  }
  User.init(
    {
      userId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
      },
      username: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      timestamps: false,
    }
  );
  return User;
};
