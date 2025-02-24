'use strict';
module.exports = {
    async up(queryInterface, Sequelize) {
        // Check if the enum type exists
        const [enumExists] = await queryInterface.sequelize.query(`SELECT EXISTS (
        SELECT 1 FROM pg_type 
        WHERE typname = 'enum_cabinets_status'
      );`);
        if (!enumExists[0].exists) {
            await queryInterface.sequelize.query('CREATE TYPE enum_cabinets_status AS ENUM (\'pending\', \'approved\', \'rejected\')');
        }
        // Check if columns exist
        const tableInfo = await queryInterface.describeTable('cabinets');
        if (!tableInfo.status) {
            await queryInterface.addColumn('cabinets', 'status', {
                type: 'enum_cabinets_status',
                allowNull: false,
                defaultValue: 'pending',
            });
        }
        if (!tableInfo.rejection_reason) {
            await queryInterface.addColumn('cabinets', 'rejection_reason', {
                type: Sequelize.TEXT,
                allowNull: true,
            });
        }
    },
    async down(queryInterface, Sequelize) {
        const tableInfo = await queryInterface.describeTable('cabinets');
        if (tableInfo.status) {
            await queryInterface.removeColumn('cabinets', 'status');
        }
        if (tableInfo.rejection_reason) {
            await queryInterface.removeColumn('cabinets', 'rejection_reason');
        }
        await queryInterface.sequelize.query(`DROP TYPE IF EXISTS enum_cabinets_status`);
    }
};
