'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Schedules', {
      scheduleId: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      scheduleName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      memo: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
    await queryInterface.addIndex('Schedules', ['createdBy']);
    await queryInterface.addConstraint('Schedules', {
      fields: ['createdBy'],
      type: 'foreign key',
      references: {
        table: 'Users',
        field: 'userId',
      },
      onDelete: 'cascade',
      onUpdate: 'cascade',
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Schedules');
  },
};
