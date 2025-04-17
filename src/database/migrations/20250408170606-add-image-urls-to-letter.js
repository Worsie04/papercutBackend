'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('letters', 'logo_url', {
      type: Sequelize.STRING, // Store the R2 object key or full URL
      allowNull: true,
    });
    await queryInterface.addColumn('letters', 'signature_url', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('letters', 'stamp_url', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('letters', 'logo_url');
    await queryInterface.removeColumn('letters', 'signature_url');
    await queryInterface.removeColumn('letters', 'stamp_url');
  }
};
