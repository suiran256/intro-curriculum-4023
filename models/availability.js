'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Availability extends Model {
    static associate(models) {
      Availability.belongsTo(models.User, { foreignKey: 'userId' });
      Availability.belongsTo(models.Candidate, { foreignKey: 'candidateId' });
    }
  }
  Availability.init(
    {
      candidateId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
      },
      availability: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      scheduleId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      sequelize,
      timestamps: false,
      indexes: [
        {
          fields: ['scheduleId'],
        },
      ],
    }
  );
  return Availability;
};
