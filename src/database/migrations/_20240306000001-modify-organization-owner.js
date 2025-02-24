'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove the existing foreign key constraint
    await queryInterface.removeConstraint('organizations', 'organizations_owner_id_fkey');

    // Add owner_type column
    await queryInterface.addColumn('organizations', 'owner_type', {
      type: Sequelize.ENUM('user', 'admin'),
      allowNull: false,
      defaultValue: 'user'
    });

    // Add index for owner_type
    await queryInterface.addIndex('organizations', ['owner_type']);
  },

  async down(queryInterface, Sequelize) {
    // Remove owner_type column and its index
    await queryInterface.removeColumn('organizations', 'owner_type');

    // Restore the original foreign key constraint
    await queryInterface.addConstraint('organizations', {
      fields: ['owner_id'],
      type: 'foreign key',
      name: 'organizations_owner_id_fkey',
      references: {
        table: 'users',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  }
}; 