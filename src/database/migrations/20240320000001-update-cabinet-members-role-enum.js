'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // First, remove any default value constraint on the role column
      await queryInterface.sequelize.query(`
        ALTER TABLE cabinet_members 
        ALTER COLUMN role DROP DEFAULT;
      `);

      // Temporarily alter the column to remove the enum constraint
      await queryInterface.sequelize.query(`
        ALTER TABLE cabinet_members 
        ALTER COLUMN role TYPE VARCHAR(255);
      `);

      // Check if the enum type exists
      const enumExists = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_type 
          WHERE typname = 'enum_cabinet_members_role'
        );
      `, { type: queryInterface.sequelize.QueryTypes.SELECT });

      // Drop the existing enum type if it exists
      if (enumExists[0].exists) {
        await queryInterface.sequelize.query(`
          DROP TYPE IF EXISTS enum_cabinet_members_role;
        `);
      }

      // Create the enum type with the new value
      await queryInterface.sequelize.query(`
        CREATE TYPE enum_cabinet_members_role AS ENUM ('owner', 'member', 'viewer', 'member_full');
      `);

      // Update existing 'member' values to 'member_full' where appropriate
      await queryInterface.sequelize.query(`
        UPDATE cabinet_members 
        SET role = 'member_full' 
        WHERE role = 'member';
      `);

      // Alter the column back to use the enum type
      await queryInterface.sequelize.query(`
        ALTER TABLE cabinet_members 
        ALTER COLUMN role TYPE enum_cabinet_members_role 
        USING role::enum_cabinet_members_role;
      `);

      // Set the default value back
      await queryInterface.sequelize.query(`
        ALTER TABLE cabinet_members 
        ALTER COLUMN role SET DEFAULT 'member'::enum_cabinet_members_role;
      `);
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // First, remove any default value constraint on the role column
      await queryInterface.sequelize.query(`
        ALTER TABLE cabinet_members 
        ALTER COLUMN role DROP DEFAULT;
      `);

      // Temporarily alter the column to remove the enum constraint
      await queryInterface.sequelize.query(`
        ALTER TABLE cabinet_members 
        ALTER COLUMN role TYPE VARCHAR(255);
      `);

      // Check if the enum type exists
      const enumExists = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_type 
          WHERE typname = 'enum_cabinet_members_role'
        );
      `, { type: queryInterface.sequelize.QueryTypes.SELECT });

      // Drop the existing enum type if it exists
      if (enumExists[0].exists) {
        await queryInterface.sequelize.query(`
          DROP TYPE IF EXISTS enum_cabinet_members_role;
        `);
      }

      // Recreate the enum type with the original values
      await queryInterface.sequelize.query(`
        CREATE TYPE enum_cabinet_members_role AS ENUM ('owner', 'member', 'viewer');
      `);

      // Update 'member_full' values back to 'member'
      await queryInterface.sequelize.query(`
        UPDATE cabinet_members 
        SET role = 'member' 
        WHERE role = 'member_full';
      `);

      // Alter the column back to use the enum type
      await queryInterface.sequelize.query(`
        ALTER TABLE cabinet_members 
        ALTER COLUMN role TYPE enum_cabinet_members_role 
        USING role::enum_cabinet_members_role;
      `);

      // Set the default value back
      await queryInterface.sequelize.query(`
        ALTER TABLE cabinet_members 
        ALTER COLUMN role SET DEFAULT 'member'::enum_cabinet_members_role;
      `);
    } catch (error) {
      console.error('Migration rollback failed:', error);
      throw error;
    }
  }
}; 