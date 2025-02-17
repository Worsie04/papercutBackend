'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      INSERT INTO "SequelizeMeta" (name)
      VALUES ('20240205_add_user_type_to_organization_members.js')
      ON CONFLICT (name) DO NOTHING;
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DELETE FROM "SequelizeMeta"
      WHERE name = '20240205_add_user_type_to_organization_members.js';
    `);
  }
}; 