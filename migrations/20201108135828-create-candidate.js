'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Candidates', {
      candidateId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
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
    await queryInterface.addIndex('Candidates', ['scheduleId']);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Candidates');
  },
};
