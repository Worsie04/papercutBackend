'use strict';
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
        await queryInterface.createTable('user_images', {
            id: {
                type: Sequelize.UUID,
                primaryKey: true,
                defaultValue: Sequelize.literal('uuid_generate_v4()'), // DB səviyyəsində default
            },
            user_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'users', // 'users' cədvəlinə istinad
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            filename: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            storage_key: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true,
            },
            public_url: {
                type: Sequelize.STRING(1024),
                allowNull: false,
            },
            size: {
                type: Sequelize.INTEGER,
                allowNull: true,
            },
            mime_type: {
                type: Sequelize.STRING,
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
        await queryInterface.addIndex('user_images', ['user_id']);
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('user_images');
    }
};
