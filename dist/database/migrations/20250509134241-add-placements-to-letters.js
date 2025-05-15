'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('letters', 'placements', {
            type: Sequelize.JSONB, // PostgreSQL üçün JSONB, MySQL/SQLite üçün Sequelize.JSON istifadə edin
            allowNull: true,
        });
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('letters', 'placements');
    }
};
