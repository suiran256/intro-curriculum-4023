'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Candidate extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Candidate.hasMany(models.Availability, { foreignKey: 'candidateId' });
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
      //freezeTableName: true,
      //timestamps: false,
      modelName: 'Candidate',
    }
  );
  return Candidate;
};
