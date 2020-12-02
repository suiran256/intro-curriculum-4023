'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Comments', {
      scheduleId: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false,
      },
      comment: {
        type: Sequelize.STRING,
        allowNull: false,
      },
    });
    await queryInterface.addConstraint('Comments', {
      fields: ['userId'],
      name: 'Comments_userId_Users_fk',
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
    // await queryInterface.removeConstraint(
    //   'Comments',
    //   'Comments_userId_Users_fk'
    // );
    await queryInterface.dropTable('Comments');
  },
};
