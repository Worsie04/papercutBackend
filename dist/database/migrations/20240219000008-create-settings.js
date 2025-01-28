'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('settings', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
            },
            key: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true,
            },
            value: {
                type: Sequelize.JSONB,
                allowNull: false,
            },
            type: {
                type: Sequelize.ENUM('system', 'security', 'email', 'storage', 'notification', 'integration'),
                allowNull: false,
                defaultValue: 'system',
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            is_public: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            is_encrypted: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            metadata: {
                type: Sequelize.JSONB,
                allowNull: true,
            },
            last_modified_by: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT',
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
            },
            deleted_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
        });
        // Add indexes
        await queryInterface.addIndex('settings', ['key']);
        await queryInterface.addIndex('settings', ['type']);
        await queryInterface.addIndex('settings', ['is_public']);
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('settings');
    }
};
