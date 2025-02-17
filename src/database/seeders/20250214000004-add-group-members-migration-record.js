'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      INSERT INTO "SequelizeMeta" (name)
      VALUES ('20240215000002-create-group-members.js')
      ON CONFLICT (name) DO NOTHING;
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DELETE FROM "SequelizeMeta"
      WHERE name = '20240215000002-create-group-members.js';
    `);
  }
}; 