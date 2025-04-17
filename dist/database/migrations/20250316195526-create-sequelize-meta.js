'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('SequelizeMeta', {
            name: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true,
                primaryKey: true
            }
        });
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('SequelizeMeta');
    }
};
