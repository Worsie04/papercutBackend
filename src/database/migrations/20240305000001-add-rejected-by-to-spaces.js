'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('spaces', 'rejected_by', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'ID of the user who rejected the space'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('spaces', 'rejected_by');
  }
}; 