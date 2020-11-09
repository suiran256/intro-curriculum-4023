'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Candidate extends Model {
    static associate(models) {
      Candidate.hasOne(models.Availability, { foreignKey: 'candidateId' });
    }
  }
  Candidate.init(
    {
      candidateId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      candidateName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      scheduleId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Candidate',
      timestamps: false,
      indexes: [
        {
          fields: ['scheduleId'],
        },
      ],
    }
  );
  return Candidate;
};
