'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add new action types to the existing enum
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_letter_action_logs_action_type" ADD VALUE IF NOT EXISTS 'delete';
    `);
    
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_letter_action_logs_action_type" ADD VALUE IF NOT EXISTS 'restore';
    `);
    
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_letter_action_logs_action_type" ADD VALUE IF NOT EXISTS 'permanent_delete';
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Note: PostgreSQL doesn't support removing enum values easily,
    // so we leave the new values in the enum for rollback safety
    // If you really need to remove them, you would need to:
    // 1. Create a new enum without these values
    // 2. Alter the column to use the new enum
    // 3. Drop the old enum
    // This is complex and risky, so we skip it for now
  }
}; 