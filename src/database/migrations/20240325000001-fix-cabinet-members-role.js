'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Step 1: Create the enum type if it doesn't exist
      await queryInterface.sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_cabinet_members_role') THEN
            CREATE TYPE enum_cabinet_members_role AS ENUM ('owner', 'member', 'viewer');
          END IF;
        END
        $$;
      `);

      // Step 2: Update any existing roles to valid values
      await queryInterface.sequelize.query(`
        UPDATE cabinet_members 
        SET role = CASE 
          WHEN role NOT IN ('owner', 'member', 'viewer') THEN 'member'
          ELSE role 
        END;
      `);

      // Step 3: Alter the column type using a temporary column
      await queryInterface.sequelize.query(`
        -- Add a temporary column with the new type
        ALTER TABLE cabinet_members 
        ADD COLUMN role_new enum_cabinet_members_role;

        -- Copy data to the new column, converting as needed
        UPDATE cabinet_members 
        SET role_new = role::enum_cabinet_members_role;

        -- Drop the old column
        ALTER TABLE cabinet_members 
        DROP COLUMN role;

        -- Rename the new column to the original name
        ALTER TABLE cabinet_members 
        RENAME COLUMN role_new TO role;

        -- Set NOT NULL constraint and default value
        ALTER TABLE cabinet_members 
        ALTER COLUMN role SET NOT NULL,
        ALTER COLUMN role SET DEFAULT 'member';
      `);

    } catch (error) {
      console.error('Migration Error:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // Convert back to string type
      await queryInterface.sequelize.query(`
        -- Add a temporary column
        ALTER TABLE cabinet_members 
        ADD COLUMN role_old VARCHAR(255);

        -- Copy data
        UPDATE cabinet_members 
        SET role_old = role::VARCHAR;

        -- Drop the enum column
        ALTER TABLE cabinet_members 
        DROP COLUMN role;

        -- Rename the string column back
        ALTER TABLE cabinet_members 
        RENAME COLUMN role_old TO role;

        -- Set constraints
        ALTER TABLE cabinet_members 
        ALTER COLUMN role SET NOT NULL,
        ALTER COLUMN role SET DEFAULT 'member';
      `);

      // Drop the enum type
      await queryInterface.sequelize.query(`
        DROP TYPE IF EXISTS enum_cabinet_members_role;
      `);
    } catch (error) {
      console.error('Migration Rollback Error:', error);
      throw error;
    }
  }
}; 