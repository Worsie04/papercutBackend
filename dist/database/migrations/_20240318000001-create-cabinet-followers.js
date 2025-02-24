'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('cabinet_followers', {
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
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            cabinet_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'cabinets',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
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
        // Add unique constraint to prevent duplicate follows
        await queryInterface.addConstraint('cabinet_followers', {
            fields: ['user_id', 'cabinet_id'],
            type: 'unique',
            name: 'unique_user_cabinet_follow'
        });
        // Add indexes
        await queryInterface.addIndex('cabinet_followers', ['user_id']);
        await queryInterface.addIndex('cabinet_followers', ['cabinet_id']);
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('cabinet_followers');
    }
};
