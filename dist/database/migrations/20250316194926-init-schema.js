'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Skip table creation as tables already exist
        // Just mark this migration as completed
        return Promise.resolve();
    },
    async down(queryInterface, Sequelize) {
        // Skip table deletion as we don't want to drop tables
        return Promise.resolve();
    }
};
