'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('template_favorites', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
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
      template_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'templates',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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
    });

    // Add unique constraint to prevent duplicate favorites
    await queryInterface.addIndex('template_favorites', {
      unique: true,
      fields: ['user_id', 'template_id'],
      name: 'unique_user_template_favorite',
    });

    // Add indexes for better query performance
    await queryInterface.addIndex('template_favorites', {
      fields: ['user_id'],
      name: 'template_favorites_user_id_idx',
    });

    await queryInterface.addIndex('template_favorites', {
      fields: ['template_id'],
      name: 'template_favorites_template_id_idx',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('template_favorites');
  },
}; 