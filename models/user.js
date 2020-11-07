'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      User.hasOne(models.Schedule, { foreignKey: 'createdBy' });
      User.hasOne(models.Availability, { foreignKey: 'userId' });
      User.hasOne(models.Comment, { foreignKey: 'userId' });
    }
  }
  User.init(
    {
      userId: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
      username: { type: DataTypes.STRING, allowNull: false },
    },
    {
      sequelize,
      freezeTableName: true,
      timestamps: false,
      modelName: 'User',
    }
  );
  return User;
};
