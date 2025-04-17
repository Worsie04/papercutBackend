'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('spaces', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
            },
            name: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            type: {
                type: Sequelize.ENUM('personal', 'corporate'),
                allowNull: false,
            },
            owner_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            created_by_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            company: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            tags: {
                type: Sequelize.ARRAY(Sequelize.STRING),
                allowNull: false,
                defaultValue: [],
            },
            country: {
                type: Sequelize.STRING,
                allowNull: false,
                defaultValue: 'US',
            },
            logo: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            require_approval: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            status: {
                type: Sequelize.ENUM('pending', 'approved', 'rejected'),
                allowNull: false,
                defaultValue: 'pending',
            },
            rejection_reason: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            rejected_by: {
                type: Sequelize.UUID,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
                comment: 'ID of the user who rejected the space'
            },
            approvers: {
                type: Sequelize.JSONB,
                allowNull: true,
                defaultValue: [],
                comment: 'Array of approvers with userId and order fields'
            },
            settings: {
                type: Sequelize.JSONB,
                allowNull: false,
                defaultValue: {},
            },
            metadata: {
                type: Sequelize.JSONB,
                allowNull: true,
            },
            storage_quota: {
                type: Sequelize.BIGINT,
                allowNull: false,
                defaultValue: 5 * 1024 * 1024 * 1024, // 5GB default
            },
            used_storage: {
                type: Sequelize.BIGINT,
                allowNull: false,
                defaultValue: 0,
            },
            is_active: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true,
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
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('spaces');
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_spaces_status;');
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_spaces_type;');
    }
};
