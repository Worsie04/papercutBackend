'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('letters', 'signed_pdf_url', {
            type: Sequelize.STRING,
            allowNull: true,
        });
        await queryInterface.addColumn('letters', 'original_pdf_file_id', {
            type: Sequelize.UUID,
            allowNull: true,
        });
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('letters', 'signed_pdf_url');
        await queryInterface.removeColumn('letters', 'original_pdf_file_id');
    }
};
