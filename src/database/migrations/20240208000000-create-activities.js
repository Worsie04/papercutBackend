'use strict';

const { DataTypes } = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // First, check if the users table exists
    const tableExists = await queryInterface.sequelize.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')",
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    
    if (!tableExists[0].exists) {
      console.log('Users table does not exist. Skipping activities table creation.');
      return;
    }

    // Create the activities table
    await queryInterface.createTable('activities', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      // Using snake_case for the column name in the database
      // This matches what Sequelize is trying to use in the SQL query
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      action: {
        type: DataTypes.ENUM(
          'CREATE',
          'UPDATE',
          'DELETE',
          'APPROVE',
          'REJECT',
          'REASSIGN',
          'SUBMIT',
          'RESUBMIT',
          'UPDATE_PERMISSIONS'
        ),
        allowNull: false,
      },
      resource_type: {
        type: DataTypes.ENUM(
          'SPACE',
          'CABINET',
          'RECORD',
          'FILE'
        ),
        allowNull: false,
      },
      resource_id: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      resource_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      details: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM(
          'completed',
          'pending',
          'rejected',
          'default'
        ),
        allowNull: true,
      },
      timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    // Add indexes for common queries
    await queryInterface.addIndex('activities', ['user_id']);
    await queryInterface.addIndex('activities', ['resource_type', 'resource_id']);
    await queryInterface.addIndex('activities', ['timestamp']);
    await queryInterface.addIndex('activities', ['status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('activities');
  }
};