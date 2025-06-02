'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('stamps', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
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
      filename: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      storage_key: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      public_url: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      size: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      mime_type: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      stamp_type: {
        type: Sequelize.ENUM('uploaded', 'processed'),
        allowNull: false,
        defaultValue: 'uploaded',
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    // Add index for userId for better query performance
    await queryInterface.addIndex('stamps', ['user_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('stamps');
  }
}; 