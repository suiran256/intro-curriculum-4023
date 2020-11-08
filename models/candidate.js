'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Candidate extends Model {
    static associate(models) {
      Candidate.hasMany(models.Availability, { foreignKey: 'candidateId' });
    }
  }
  Candidate.init(
    {
      candidateId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoincrement: true,
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
    }
  );
  return Candidate;
};
