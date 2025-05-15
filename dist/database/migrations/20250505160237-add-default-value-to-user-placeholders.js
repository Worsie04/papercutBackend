'use strict';
module.exports = {
    async up(queryInterface, Sequelize) {
        // Ensure uuid-ossp extension exists for UUID generation
        await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
        // Create the user_placeholders table
        await queryInterface.createTable('user_placeholders', {
            id: {
                type: Sequelize.UUID,
                primaryKey: true,
            },
            user_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            name: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            type: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            default_value: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW,
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW,
            },
            deleted_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
        });
        // Set default value for id column to uuid_generate_v4()
        await queryInterface.sequelize.query(`
      ALTER TABLE user_placeholders
      ALTER COLUMN id SET DEFAULT uuid_generate_v4();
    `);
        // Add unique constraint on user_id and name for non-deleted records
        await queryInterface.addConstraint('user_placeholders', {
            fields: ['user_id', 'name'],
            type: 'unique',
            name: 'unique_user_placeholder_name',
            where: {
                deleted_at: null,
            },
        });
        // Add index on user_id for performance
        await queryInterface.addIndex('user_placeholders', ['user_id']);
    },
    async down(queryInterface, Sequelize) {
        // Drop the user_placeholders table
        await queryInterface.dropTable('user_placeholders');
        // Optionally drop the uuid-ossp extension if it’s no longer needed
        // await queryInterface.sequelize.query('DROP EXTENSION IF EXISTS "uuid-ossp";');
    },
};
