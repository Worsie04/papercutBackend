'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add GIN indexes for custom_fields JSONB column
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS records_custom_fields_gin_idx ON records USING GIN (custom_fields);
      CREATE INDEX IF NOT EXISTS records_custom_fields_path_ops_idx ON records USING GIN ((custom_fields -> 'fieldId') jsonb_path_ops);
      CREATE INDEX IF NOT EXISTS records_custom_fields_value_ops_idx ON records USING GIN ((custom_fields -> 'value') jsonb_path_ops);
    `);
  },

  async down (queryInterface, Sequelize) {
    // Remove GIN indexes
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS records_custom_fields_gin_idx;
      DROP INDEX IF EXISTS records_custom_fields_path_ops_idx;
      DROP INDEX IF EXISTS records_custom_fields_value_ops_idx;
    `);
  }
};
