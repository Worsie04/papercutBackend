'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cabinet_members', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      cabinet_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'cabinets',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      role: {
        type: Sequelize.ENUM('owner', 'member', 'viewer', 'member_full'),
        allowNull: false,
        defaultValue: 'member',
      },
      permissions: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {
          readRecords: true,
          createRecords: false,
          updateRecords: false,
          deleteRecords: false,
          manageCabinet: false,
          downloadFiles: true,
          exportTables: false
        },
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
    await queryInterface.addIndex('cabinet_members', ['cabinet_id']);
    await queryInterface.addIndex('cabinet_members', ['user_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('cabinet_members');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_cabinet_members_role;');
  }
}; 