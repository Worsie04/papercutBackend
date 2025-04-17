'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Create enum type for owner_type
        await queryInterface.sequelize.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_organizations_owner_type') THEN
          CREATE TYPE "enum_organizations_owner_type" AS ENUM ('user', 'admin');
        END IF;
      END $$;
    `);
        // Create organizations table
        await queryInterface.createTable('organizations', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
            },
            name: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true,
            },
            type: {
                type: Sequelize.ENUM('Personal', 'Corporate'),
                allowNull: false,
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            logo: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            domain: {
                type: Sequelize.STRING,
                allowNull: false,
                validate: {
                    is: /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/i
                }
            },
            subscription: {
                type: Sequelize.ENUM('Free', 'Pro', 'Enterprise'),
                allowNull: false,
                defaultValue: 'Free',
            },
            visibility: {
                type: Sequelize.ENUM('Public', 'Private'),
                allowNull: false,
                defaultValue: 'Private',
            },
            owner_id: {
                type: Sequelize.UUID,
                allowNull: false,
            },
            owner_type: {
                type: Sequelize.ENUM('user', 'admin'),
                allowNull: false,
                defaultValue: 'user'
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
        // Add indexes
        await queryInterface.addIndex('organizations', ['owner_id']);
        await queryInterface.addIndex('organizations', ['type']);
        await queryInterface.addIndex('organizations', ['owner_type']);
        await queryInterface.addIndex('organizations', {
            fields: ['owner_id', 'owner_type'],
            name: 'organizations_owner_lookup_idx'
        });
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('organizations');
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_organizations_type;');
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_organizations_subscription;');
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_organizations_visibility;');
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_organizations_owner_type;');
    }
};
