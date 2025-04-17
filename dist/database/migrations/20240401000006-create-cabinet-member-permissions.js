'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('cabinet_member_permissions', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
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
            cabinet_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'cabinets',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            cabinet_member_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'cabinet_members',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            role: {
                type: Sequelize.ENUM('member_full', 'member_read', 'member_write', 'admin'),
                defaultValue: 'member_full',
                allowNull: false
            },
            permissions: {
                type: Sequelize.JSONB,
                allowNull: false,
                defaultValue: {
                    readRecords: true,
                    createRecords: false,
                    updateRecords: false,
                    deleteRecords: false,
                    manageCabinet: false,
                    downloadFiles: true,
                    exportTables: false
                }
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
            },
            deleted_at: {
                type: Sequelize.DATE,
                allowNull: true
            }
        });
        // Add unique constraint to prevent duplicate user-cabinet combinations
        await queryInterface.addConstraint('cabinet_member_permissions', {
            fields: ['user_id', 'cabinet_id', 'cabinet_member_id'],
            type: 'unique',
            name: 'unique_user_cabinet_member_permission'
        });
        // Add indexes for foreign keys
        await queryInterface.addIndex('cabinet_member_permissions', ['user_id']);
        await queryInterface.addIndex('cabinet_member_permissions', ['cabinet_id']);
        await queryInterface.addIndex('cabinet_member_permissions', ['cabinet_member_id']);
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('cabinet_member_permissions');
    }
};
