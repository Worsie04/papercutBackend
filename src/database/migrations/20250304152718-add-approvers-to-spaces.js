'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('spaces', 'approvers', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of approvers with userId and order fields'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('spaces', 'approvers');
  }
};
