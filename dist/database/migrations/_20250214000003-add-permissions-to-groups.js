'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('groups', 'permissions', {
            type: Sequelize.JSONB,
            allowNull: false,
            defaultValue: {
                readRecords: false,
                manageCabinet: false,
                downloadFiles: false,
                exportTables: false,
            },
        });
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('groups', 'permissions');
    }
};
