'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // First check if the column exists
    const tableInfo = await queryInterface.describeTable('cabinet_members');
    
    // Check if id column exists, if not, add it
    if (!tableInfo.id) {
      await queryInterface.addColumn('cabinet_members', 'id', {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      });
    }

    // Check if deleted_at column exists, if not, add it
    if (!tableInfo.deleted_at) {
      await queryInterface.addColumn('cabinet_members', 'deleted_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove columns added in the up method
    try {
      await queryInterface.removeColumn('cabinet_members', 'id');
    } catch (error) {
      console.log('Column id may not exist, continuing...');
    }
    
    try {
      await queryInterface.removeColumn('cabinet_members', 'deleted_at');
    } catch (error) {
      console.log('Column deleted_at may not exist, continuing...');
    }
  }
};
