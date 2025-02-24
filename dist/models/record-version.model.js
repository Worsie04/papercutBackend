"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecordVersion = void 0;
const sequelize_1 = require("sequelize");
const base_model_1 = require("./base.model");
const sequelize_2 = require("../infrastructure/database/sequelize");
const record_model_1 = require("./record.model");
class RecordVersion extends base_model_1.BaseModel {
}
exports.RecordVersion = RecordVersion;
RecordVersion.init(Object.assign(Object.assign({}, base_model_1.baseModelConfig), { recordId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'records',
            key: 'id',
        },
        field: 'record_id',
    }, version: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    }, filePath: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        field: 'file_path',
    }, fileName: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        field: 'file_name',
    }, fileSize: {
        type: sequelize_1.DataTypes.BIGINT,
        allowNull: false,
        field: 'file_size',
    }, fileType: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        field: 'file_type',
    }, fileHash: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        field: 'file_hash',
    }, uploadedBy: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
        field: 'uploaded_by',
    }, note: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    } }), {
    sequelize: sequelize_2.sequelize,
    modelName: 'RecordVersion',
    tableName: 'record_versions',
    paranoid: true,
});
// Set up associations
record_model_1.Record.hasMany(RecordVersion, {
    foreignKey: 'recordId',
    as: 'versions',
});
RecordVersion.belongsTo(record_model_1.Record, {
    foreignKey: 'recordId',
    as: 'record',
});
