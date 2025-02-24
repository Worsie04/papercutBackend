'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        try {
            // Drop existing indexes if they exist
            await queryInterface.sequelize.query('DROP INDEX IF EXISTS space_invitations_email;');
            await queryInterface.sequelize.query('DROP INDEX IF EXISTS space_invitations_status;');
            await queryInterface.sequelize.query('DROP INDEX IF EXISTS unique_pending_invitation;');
            // Temporarily change the column to text to preserve data
            await queryInterface.sequelize.query(`
        ALTER TABLE space_invitations 
        ALTER COLUMN status TYPE text;
      `);
            // Drop the old enum type if it exists
            await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_space_invitations_status CASCADE;');
            // Create the new enum type
            await queryInterface.sequelize.query(`
        CREATE TYPE enum_space_invitations_status AS ENUM ('pending', 'accepted', 'rejected', 'expired');
      `);
            // Convert the column back to the enum type
            await queryInterface.sequelize.query(`
        ALTER TABLE space_invitations 
        ALTER COLUMN status TYPE enum_space_invitations_status 
        USING status::enum_space_invitations_status;
      `);
            // Set the default value
            await queryInterface.sequelize.query(`
        ALTER TABLE space_invitations 
        ALTER COLUMN status SET DEFAULT 'pending'::enum_space_invitations_status;
      `);
            // Recreate the indexes
            await queryInterface.addIndex('space_invitations', ['email']);
            await queryInterface.addIndex('space_invitations', ['status']);
            await queryInterface.addIndex('space_invitations', ['space_id', 'email'], {
                unique: true,
                where: {
                    status: 'pending',
                },
                name: 'unique_pending_invitation',
            });
        }
        catch (error) {
            console.error('Migration failed:', error);
            throw error;
        }
    },
    async down(queryInterface, Sequelize) {
        try {
            // Drop indexes
            await queryInterface.sequelize.query('DROP INDEX IF EXISTS space_invitations_email;');
            await queryInterface.sequelize.query('DROP INDEX IF EXISTS space_invitations_status;');
            await queryInterface.sequelize.query('DROP INDEX IF EXISTS unique_pending_invitation;');
            // Convert status back to text
            await queryInterface.sequelize.query(`
        ALTER TABLE space_invitations 
        ALTER COLUMN status TYPE text;
      `);
            // Drop the enum type
            await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_space_invitations_status;');
            // Recreate indexes
            await queryInterface.addIndex('space_invitations', ['email']);
            await queryInterface.addIndex('space_invitations', ['status']);
            await queryInterface.addIndex('space_invitations', ['space_id', 'email'], {
                unique: true,
                where: {
                    status: 'pending',
                },
                name: 'unique_pending_invitation',
            });
        }
        catch (error) {
            console.error('Migration rollback failed:', error);
            throw error;
        }
    }
};
