'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // ENUM tipləri yoxlanılır və yoxdursa yaradılır
        await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_cabinets_notes_comments_type') THEN
          CREATE TYPE "enum_cabinets_notes_comments_type" AS ENUM ('note', 'comment', 'system');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_cabinets_notes_comments_action') THEN
          CREATE TYPE "enum_cabinets_notes_comments_action" AS ENUM ('approve', 'reject', 'update', 'reassign');
        END IF;
      END
      $$;
    `);
        await queryInterface.createTable('cabinets_notes_comments', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                allowNull: false,
                primaryKey: true,
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
            content: {
                type: Sequelize.TEXT,
                allowNull: false,
            },
            type: {
                type: 'enum_cabinets_notes_comments_type',
                allowNull: false,
                defaultValue: 'comment',
            },
            action: {
                type: 'enum_cabinets_notes_comments_action',
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
        // Indexlər əlavə olunur
        await queryInterface.addIndex('cabinets_notes_comments', ['cabinet_id']);
        await queryInterface.addIndex('cabinets_notes_comments', ['created_by']);
        await queryInterface.addIndex('cabinets_notes_comments', ['type']);
        await queryInterface.addIndex('cabinets_notes_comments', ['action']);
        await queryInterface.addIndex('cabinets_notes_comments', ['created_at']);
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('cabinets_notes_comments');
        // ENUM tipləri silinir
        await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        DROP TYPE IF EXISTS "enum_cabinets_notes_comments_type";
        DROP TYPE IF EXISTS "enum_cabinets_notes_comments_action";
      END
      $$;
    `);
    }
};
