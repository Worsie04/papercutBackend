'use strict';
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('template_shares', {
      id: {
        type: Sequelize.UUID, // Or Sequelize.INTEGER + autoIncrement: true
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      template_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'templates', // name of the target table
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE', // Or 'SET NULL' if you want to keep history after template deletion
      },
      shared_by_user_id: { // User who performed the action
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE', // Or 'SET NULL'
      },
      shared_with_user_id: { // User who received the share in this event
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE', // Or 'SET NULL'
      },
      shared_at: { // Timestamp of the share action
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      // Optional: Add action_type ENUM later if needed
      // created_at and updated_at are often useful too, though shared_at covers the main point
       created_at: {
         allowNull: false,
         type: Sequelize.DATE
       },
       updated_at: {
         allowNull: false,
         type: Sequelize.DATE
       }
    });
    // Optional: Add indexes for faster lookups
    await queryInterface.addIndex('template_shares', ['template_id']);
    await queryInterface.addIndex('template_shares', ['shared_with_user_id']);
  },
  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('template_shares');
  }
};