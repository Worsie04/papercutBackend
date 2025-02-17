'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('record_versions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      recordId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'records',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        field: 'record_id'
      },
      version: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      filePath: {
        type: Sequelize.STRING,
        allowNull: false,
        field: 'file_path'
      },
      fileName: {
        type: Sequelize.STRING,
        allowNull: false,
        field: 'file_name'
      },
      fileSize: {
        type: Sequelize.BIGINT,
        allowNull: false,
        field: 'file_size'
      },
      fileType: {
        type: Sequelize.STRING,
        allowNull: false,
        field: 'file_type'
      },
      fileHash: {
        type: Sequelize.STRING,
        allowNull: false,
        field: 'file_hash'
      },
      uploadedBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        field: 'uploaded_by'
      },
      note: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        field: 'created_at',
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        field: 'updated_at',
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      deletedAt: {
        type: Sequelize.DATE,
        field: 'deleted_at',
        allowNull: true
      }
    });

    // Add indexes
    await queryInterface.addIndex('record_versions', ['record_id']);
    await queryInterface.addIndex('record_versions', ['uploaded_by']);
    await queryInterface.addIndex('record_versions', ['version']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('record_versions');
  }
}; 