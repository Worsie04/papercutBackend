'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if ENUM type exists and create it if it doesn't
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_space_comments_rejects_type') THEN
          CREATE TYPE "enum_space_comments_rejects_type" AS ENUM ('comment', 'rejection', 'approval', 'update', 'system');
        END IF;
      END
      $$;
    `);

    await queryInterface.createTable('space_comments_rejects', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
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
      message: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      type: {
        type: 'enum_space_comments_rejects_type',
        allowNull: false,
        defaultValue: 'comment',
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

    // Add indexes for better performance
    await queryInterface.addIndex('space_comments_rejects', ['space_id']);
    await queryInterface.addIndex('space_comments_rejects', ['user_id']);
    await queryInterface.addIndex('space_comments_rejects', ['type']);
    await queryInterface.addIndex('space_comments_rejects', ['created_at']);

    // Add comments to the table and columns
    await queryInterface.sequelize.query(`
      COMMENT ON TABLE space_comments_rejects IS 'Stores comments and rejection reasons for spaces';
      COMMENT ON COLUMN space_comments_rejects.id IS 'Unique identifier for the comment';
      COMMENT ON COLUMN space_comments_rejects.space_id IS 'Reference to the space this comment belongs to';
      COMMENT ON COLUMN space_comments_rejects.user_id IS 'Reference to the user who created this comment';
      COMMENT ON COLUMN space_comments_rejects.message IS 'The content of the comment or rejection reason';
      COMMENT ON COLUMN space_comments_rejects.type IS 'Type of the message: comment, rejection, approval, update, or system';
      COMMENT ON COLUMN space_comments_rejects.created_at IS 'Timestamp when the comment was created';
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('space_comments_rejects');
    
    // Drop ENUM type if it exists
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        DROP TYPE IF EXISTS "enum_space_comments_rejects_type";
      END
      $$;
    `);
  }
}; 