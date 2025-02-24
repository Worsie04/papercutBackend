'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create the ENUM type if it doesn't exist
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_organization_members_user_type') THEN
          CREATE TYPE "enum_organization_members_user_type" AS ENUM ('user', 'admin');
        END IF;
      END$$;
    `);

    // Add the column
    await queryInterface.addColumn('organization_members', 'user_type', {
      type: Sequelize.ENUM('user', 'admin'),
      allowNull: false,
      defaultValue: 'user'
    });

    // Update existing records
    await queryInterface.sequelize.query(`
      UPDATE organization_members om
      SET user_type = CASE
        WHEN EXISTS (SELECT 1 FROM admins a WHERE a.id = om.user_id) THEN 'admin'::enum_organization_members_user_type
        ELSE 'user'::enum_organization_members_user_type
      END;
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('organization_members', 'user_type');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_organization_members_user_type";');
  }
}; 