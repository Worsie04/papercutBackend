'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // First ensure the uuid-ossp extension is available
        await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
        // Then set the default value for the id column
        await queryInterface.sequelize.query(`
      ALTER TABLE user_roles 
      ALTER COLUMN id SET DEFAULT uuid_generate_v4();
    `);
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.sequelize.query(`
      ALTER TABLE user_roles 
      ALTER COLUMN id DROP DEFAULT;
    `);
    }
};
