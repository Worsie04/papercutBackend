'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('organizations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      type: {
        type: Sequelize.ENUM('Personal', 'Corporate'),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      logo: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      subscription: {
        type: Sequelize.ENUM('Free', 'Pro', 'Enterprise'),
        allowNull: false,
        defaultValue: 'Free',
      },
      visibility: {
        type: Sequelize.ENUM('Public', 'Private'),
        allowNull: false,
        defaultValue: 'Private',
      },
      owner_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Add indexes
    await queryInterface.addIndex('organizations', ['owner_id']);
    await queryInterface.addIndex('organizations', ['type']);
    await queryInterface.addIndex('organizations', ['visibility']);
    await queryInterface.addIndex('organizations', ['subscription']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('organizations');
  }
}; 