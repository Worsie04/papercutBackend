'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Ensure the uuid-ossp extension is available
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    
    await queryInterface.createTable('user_roles', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
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
      role_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'roles',
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
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // Set the database-level default for the id column
    await queryInterface.sequelize.query(`
      ALTER TABLE user_roles 
      ALTER COLUMN id SET DEFAULT uuid_generate_v4();
    `);

    // Add a unique constraint to prevent duplicate user-role assignments
    await queryInterface.addConstraint('user_roles', {
      fields: ['user_id', 'role_id'],
      type: 'unique',
      name: 'unique_user_role',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('user_roles');
  }
}; 