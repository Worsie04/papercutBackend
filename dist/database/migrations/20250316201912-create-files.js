'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('files', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true
            },
            name: {
                type: Sequelize.STRING,
                allowNull: false
            },
            original_name: {
                type: Sequelize.STRING,
                allowNull: false
            },
            path: {
                type: Sequelize.STRING,
                allowNull: false
            },
            type: {
                type: Sequelize.STRING,
                allowNull: false
            },
            size: {
                type: Sequelize.INTEGER,
                allowNull: false
            },
            is_allocated: {
                type: Sequelize.BOOLEAN,
                defaultValue: false
            },
            user_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });
        // Add indexes
        await queryInterface.addIndex('files', ['user_id']);
        await queryInterface.addIndex('files', ['is_allocated']);
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('files');
    }
};
