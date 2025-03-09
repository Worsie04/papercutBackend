'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('pdf_files', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      record_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'records',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      original_file_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      file_path: {
        type: Sequelize.STRING,
        allowNull: false
      },
      file_size: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      file_hash: {
        type: Sequelize.STRING,
        allowNull: false
      },
      page_count: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      extracted_text: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      extracted_metadata: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
    // Add index for faster record lookup
    await queryInterface.addIndex('pdf_files', ['record_id']);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('pdf_files');
  }
};