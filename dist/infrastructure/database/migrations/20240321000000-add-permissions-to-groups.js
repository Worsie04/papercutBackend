"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
const sequelize_1 = require("sequelize");
async function up(queryInterface) {
    await queryInterface.addColumn('groups', 'permissions', {
        type: sequelize_1.DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
            readRecords: false,
            manageCabinet: false,
            downloadFiles: false,
            exportTables: false,
        },
    });
}
async function down(queryInterface) {
    await queryInterface.removeColumn('groups', 'permissions');
}
