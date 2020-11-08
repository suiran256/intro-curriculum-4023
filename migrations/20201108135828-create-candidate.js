'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Candidates', {
      candidateId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoincrement: true,
      },
      candidateName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      scheduleId: {
        type: Sequelize.UUID,
        allowNull: false,
      },
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Candidates');
  },
};
