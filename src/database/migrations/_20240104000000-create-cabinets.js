'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('cabinets', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      company: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
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
      parent_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'cabinets',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      tags: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: false,
        defaultValue: [],
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      settings: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      custom_fields: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      members: {
        type: Sequelize.ARRAY(Sequelize.UUID),
        allowNull: false,
        defaultValue: [],
      },
      approvers: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      approver_note: {
        type: Sequelize.TEXT,
        allowNull: true,
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

    // Add indexes
    await queryInterface.addIndex('cabinets', ['parent_id']);
    await queryInterface.addIndex('cabinets', ['space_id']);
    await queryInterface.addIndex('cabinets', ['company']);
    await queryInterface.addIndex('cabinets', ['tags']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('cabinets');
  }
}; 