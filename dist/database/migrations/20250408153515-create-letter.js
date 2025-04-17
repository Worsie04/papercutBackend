'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        /**
         * Creates the letters table.
         */
        await queryInterface.createTable('letters', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            name: {
                type: Sequelize.STRING,
                allowNull: true, // Optional name/title for the letter
            },
            // Foreign key referencing the template used to create this letter
            template_id: {
                type: Sequelize.UUID,
                allowNull: true, // A letter must be based on a template
                references: {
                    model: 'templates', // Name of the templates table
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                // Decide deletion behavior:
                // 'CASCADE': Delete letter if template is deleted.
                // 'SET NULL': Set template_id to null if template is deleted (requires template_id to be nullable).
                // 'RESTRICT'/'NO ACTION': Prevent template deletion if letters are using it.
                onDelete: 'RESTRICT', // Safer default: prevent template deletion if used by letters
            },
            // Foreign key referencing the user who created this letter
            user_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'users', // Name of the users table
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE', // Delete letters if the user is deleted
            },
            // Store the specific form data entered for this letter instance
            form_data: {
                type: Sequelize.JSONB,
                allowNull: true,
            },
            // Timestamps
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW,
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW,
            }
        });
        // Optional: Add indexes for frequently queried columns
        await queryInterface.addIndex('letters', ['user_id']);
        await queryInterface.addIndex('letters', ['template_id']);
    },
    async down(queryInterface, Sequelize) {
        /**
         * Drops the letters table.
         */
        await queryInterface.dropTable('letters');
    }
};
