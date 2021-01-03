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
//      name: 'Availabilities_userId_Users_fk',
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
 //     name: 'Availabilities_candidateId_Candidates_fk',
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
    // await queryInterface.removeConstraint(
    //   'Availabilities',
    //   'Availabilities_candidateId_Candidates_fk'
    // );
    // await queryInterface.removeConstraint(
    //   'Availabilities',
    //   'Availabilities_userId_Users_fk'
    // );
    await queryInterface.dropTable('Availabilities');
  },
};
