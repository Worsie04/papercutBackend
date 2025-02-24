'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Create organization_members table
        await queryInterface.createTable('organization_members', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
            },
            organization_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'organizations',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
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
            role: {
                type: Sequelize.ENUM('owner', 'admin', 'member_full', 'member_readonly', 'guest', 'custom'),
                allowNull: false,
                defaultValue: 'member_full',
            },
            custom_permissions: {
                type: Sequelize.JSON,
                allowNull: true,
                comment: 'Custom permissions for the custom role',
            },
            invited_by: {
                type: Sequelize.UUID,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id',
                },
            },
            status: {
                type: Sequelize.ENUM('pending', 'active', 'suspended'),
                allowNull: false,
                defaultValue: 'active',
            },
            expires_at: {
                type: Sequelize.DATE,
                allowNull: true,
                comment: 'Expiration date for guest access',
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
            },
        });
        // Add unique constraint to prevent duplicate memberships
        await queryInterface.addConstraint('organization_members', {
            fields: ['organization_id', 'user_id'],
            type: 'unique',
            name: 'unique_organization_member',
        });
        // Add indexes
        await queryInterface.addIndex('organization_members', ['organization_id']);
        await queryInterface.addIndex('organization_members', ['user_id']);
        await queryInterface.addIndex('organization_members', ['role']);
        await queryInterface.addIndex('organization_members', ['status']);
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('organization_members');
    }
};
