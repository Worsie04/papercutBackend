"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../infrastructure/database/sequelize");
class RecordFile extends sequelize_1.Model {
}
RecordFile.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    recordId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'records',
            key: 'id',
        },
        field: 'record_id',
    },
    fileId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'files',
            key: 'id',
        },
        field: 'file_id',
    },
}, {
    tableName: 'record_files',
    sequelize: sequelize_2.sequelize,
    timestamps: true,
});
exports.default = RecordFile;
