'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // First, remove any existing foreign key constraints
    try {
      await queryInterface.removeConstraint('organizations', 'organizations_owner_id_fkey');
    } catch (error) {
      // Constraint might not exist, continue
    }

    // Make sure owner_type ENUM exists
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_organizations_owner_type') THEN
          CREATE TYPE "enum_organizations_owner_type" AS ENUM ('user', 'admin');
        END IF;
      END $$;
    `);

    // Update owner_type column if it doesn't exist
    const table = await queryInterface.describeTable('organizations');
    if (!table.owner_type) {
      await queryInterface.addColumn('organizations', 'owner_type', {
        type: Sequelize.ENUM('user', 'admin'),
        allowNull: false,
        defaultValue: 'user'
      });
    }

    // Add index for owner lookups
    await queryInterface.addIndex('organizations', {
      fields: ['owner_id', 'owner_type'],
      name: 'organizations_owner_lookup_idx'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove the index
    await queryInterface.removeIndex('organizations', 'organizations_owner_lookup_idx');

    // Add back the original foreign key constraint to users table
    await queryInterface.addConstraint('organizations', {
      fields: ['owner_id'],
      type: 'foreign key',
      name: 'organizations_owner_id_fkey',
      references: {
        table: 'users',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  }
}; 