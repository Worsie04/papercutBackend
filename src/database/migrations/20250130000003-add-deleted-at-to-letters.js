'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('letters', 'deleted_at', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null
    });

    // Also add DELETED to the workflow_status enum if not already present
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_letters_workflow_status" ADD VALUE IF NOT EXISTS 'deleted';
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('letters', 'deleted_at');
    
    // Note: PostgreSQL doesn't support removing enum values easily,
    // so we leave the 'deleted' value in the enum for rollback safety
  }
}; 