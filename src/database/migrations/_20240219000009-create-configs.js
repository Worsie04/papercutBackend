'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('configs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      key: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      value: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      type: {
        type: Sequelize.ENUM('global', 'space', 'cabinet', 'user'),
        allowNull: false,
        defaultValue: 'global',
      },
      scope_id: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'ID of the scope (space_id, cabinet_id, user_id) if type is not global',
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      validation_rules: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'JSON schema for validating the config value',
      },
      is_system: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_required: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_visible: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      ui_schema: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'UI rendering schema for the config',
      },
      default_value: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      last_modified_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
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
    await queryInterface.addIndex('configs', ['key']);
    await queryInterface.addIndex('configs', ['type']);
    await queryInterface.addIndex('configs', ['scope_id']);
    await queryInterface.addIndex('configs', ['is_system']);
    
    // Add unique constraint for key within same type and scope
    await queryInterface.addConstraint('configs', {
      fields: ['key', 'type', 'scope_id'],
      type: 'unique',
      name: 'unique_config_key_type_scope',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('configs');
  }
}; 