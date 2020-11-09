'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Schedule extends Model {
    static associate(models) {
      Schedule.belongsTo(models.User, { foreignKey: 'createdBy' });
    }
  }
  Schedule.init(
    {
      scheduleId: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
      },
      scheduleName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      memo: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Schedule',
      timestamps: false,
      indexes: [
        {
          fields: ['createdBy'],
        },
      ],
    }
  );
  return Schedule;
};
