'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('spaces', 'status', {
      type: Sequelize.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
    });

    await queryInterface.addColumn('spaces', 'rejection_reason', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('spaces', 'rejection_reason');
    await queryInterface.removeColumn('spaces', 'status');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_spaces_status;');
  }
}; 