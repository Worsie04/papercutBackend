'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      INSERT INTO "SequelizeMeta" (name)
      VALUES ('20240214000000-create-cabinet-members.js')
      ON CONFLICT (name) DO NOTHING;
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DELETE FROM "SequelizeMeta"
      WHERE name = '20240214000000-create-cabinet-members.js';
    `);
  }
}; 