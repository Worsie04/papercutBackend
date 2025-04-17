'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // First, drop the default value
        await queryInterface.sequelize.query(`
      ALTER TABLE organization_members 
      ALTER COLUMN role DROP DEFAULT;
    `);
        // Then change the column type to STRING to hold any value
        await queryInterface.sequelize.query(`
      ALTER TABLE organization_members 
      ALTER COLUMN role TYPE VARCHAR(255);
    `);
        // Update existing values to match new enum values
        await queryInterface.sequelize.query(`
      UPDATE organization_members 
      SET role = 'member_read' 
      WHERE role = 'member_readonly';

      UPDATE organization_members 
      SET role = 'member_full' 
      WHERE role = 'admin';

      UPDATE organization_members 
      SET role = 'member_full' 
      WHERE role = 'custom';
    `);
        // Drop the existing enum type
        await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS enum_organization_members_role;
    `);
        // Create new enum type with updated values
        await queryInterface.sequelize.query(`
      CREATE TYPE enum_organization_members_role AS ENUM (
        'owner',
        'member_full',
        'member_read',
        'co_owner',
        'system_admin',
        'super_user',
        'guest'
      );
    `);
        // Set the column to use the new enum type
        await queryInterface.sequelize.query(`
      ALTER TABLE organization_members 
      ALTER COLUMN role TYPE enum_organization_members_role 
      USING role::enum_organization_members_role;

      ALTER TABLE organization_members 
      ALTER COLUMN role SET DEFAULT 'member_full';
    `);
    },
    async down(queryInterface, Sequelize) {
        // First, drop the default value
        await queryInterface.sequelize.query(`
      ALTER TABLE organization_members 
      ALTER COLUMN role DROP DEFAULT;
    `);
        // Then change the column type to STRING
        await queryInterface.sequelize.query(`
      ALTER TABLE organization_members 
      ALTER COLUMN role TYPE VARCHAR(255);
    `);
        // Update data back to old values
        await queryInterface.sequelize.query(`
      UPDATE organization_members 
      SET role = 'member_readonly' 
      WHERE role = 'member_read';

      UPDATE organization_members 
      SET role = 'admin' 
      WHERE role IN ('co_owner', 'system_admin', 'super_user');
    `);
        // Drop the new enum type
        await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS enum_organization_members_role;
    `);
        // Recreate the original enum type
        await queryInterface.sequelize.query(`
      CREATE TYPE enum_organization_members_role AS ENUM (
        'owner',
        'admin',
        'member_full',
        'member_readonly',
        'guest',
        'custom'
      );
    `);
        // Set the column to use the original enum type
        await queryInterface.sequelize.query(`
      ALTER TABLE organization_members 
      ALTER COLUMN role TYPE enum_organization_members_role 
      USING role::enum_organization_members_role;

      ALTER TABLE organization_members 
      ALTER COLUMN role SET DEFAULT 'member_full';
    `);
    }
};
