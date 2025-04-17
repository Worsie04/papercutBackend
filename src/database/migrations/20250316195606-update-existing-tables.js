'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Skip constraint creation as they were already added manually
    // Just mark this migration as completed
    return Promise.resolve();
  },

  async down(queryInterface, Sequelize) {
    // Skip constraint removal as we don't want to remove them
    return Promise.resolve();
  }
};
