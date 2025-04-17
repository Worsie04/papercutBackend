'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Check if ENUM types exist and create them if they don't
        await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_records_notes_comments_type') THEN
          CREATE TYPE "enum_records_notes_comments_type" AS ENUM ('note', 'comment', 'system');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_records_notes_comments_action') THEN
          CREATE TYPE "enum_records_notes_comments_action" AS ENUM ('approve', 'reject', 'update', 'reassign');
        END IF;
      END
      $$;
    `);
        await queryInterface.createTable('records_notes_comments', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                allowNull: false,
                primaryKey: true,
            },
            record_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'records',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            content: {
                type: Sequelize.TEXT,
                allowNull: false,
            },
            type: {
                type: 'enum_records_notes_comments_type',
                allowNull: false,
                defaultValue: 'comment',
            },
            action: {
                type: 'enum_records_notes_comments_action',
                allowNull: true,
            },
            created_by: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            deleted_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
        });
        // Add indexes
        await queryInterface.addIndex('records_notes_comments', ['record_id']);
        await queryInterface.addIndex('records_notes_comments', ['created_by']);
        await queryInterface.addIndex('records_notes_comments', ['type']);
        await queryInterface.addIndex('records_notes_comments', ['action']);
        await queryInterface.addIndex('records_notes_comments', ['created_at']);
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('records_notes_comments');
        // Drop ENUM types if they exist
        await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        DROP TYPE IF EXISTS "enum_records_notes_comments_type";
        DROP TYPE IF EXISTS "enum_records_notes_comments_action";
      END
      $$;
    `);
    }
};
