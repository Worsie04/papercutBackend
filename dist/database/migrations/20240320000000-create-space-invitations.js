'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('space_invitations', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
            },
            space_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'spaces',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            email: {
                type: Sequelize.STRING,
                allowNull: false,
                validate: {
                    isEmail: true,
                },
            },
            role: {
                type: Sequelize.STRING,
                allowNull: false,
                validate: {
                    isIn: [['member', 'co-owner', 'readonly']],
                },
            },
            inviter_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            status: {
                type: Sequelize.ENUM('pending', 'accepted', 'rejected', 'expired'),
                allowNull: false,
                defaultValue: 'pending',
            },
            message: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            expires_at: {
                type: Sequelize.DATE,
                allowNull: true,
                defaultValue: Sequelize.fn('NOW'),
            },
            accepted_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.fn('NOW'),
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.fn('NOW'),
            },
        });
        // Add indexes for better query performance
        await queryInterface.addIndex('space_invitations', ['email']);
        await queryInterface.addIndex('space_invitations', ['status']);
        await queryInterface.addIndex('space_invitations', ['space_id', 'email'], {
            unique: true,
            where: {
                status: 'pending',
            },
            name: 'unique_pending_invitation',
        });
    },
    async down(queryInterface, Sequelize) {
        // Remove indexes first
        await queryInterface.removeIndex('space_invitations', 'space_invitations_email');
        await queryInterface.removeIndex('space_invitations', 'space_invitations_status');
        await queryInterface.removeIndex('space_invitations', 'unique_pending_invitation');
        // Drop the table
        await queryInterface.dropTable('space_invitations');
    },
};
