'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Availabilities', {
      candidateId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false,
      },
      availability: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      scheduleId: {
        type: Sequelize.UUID,
        allowNull: false,
        // references: {
        //   model: {
        //     tableName: 'Schedules',
        //   },
        //   key: 'scheduleId',
        // },
      },
    });
    await queryInterface.addIndex('Availabilities', ['scheduleId']);
    await queryInterface.addConstraint('Availabilities', {
      fields: ['userId'],
      type: 'foreign key',
      references: {
        table: 'Users',
        field: 'userId',
      },
      onDelete: 'cascade',
      onUpdate: 'cascade',
    });
    await queryInterface.addConstraint('Availabilities', {
      fields: ['candidateId'],
      type: 'foreign key',
      references: {
        table: 'Candidates',
        field: 'candidateId',
      },
      onDelete: 'cascade',
      onUpdate: 'cascade',
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Availabilities');
  },
};
