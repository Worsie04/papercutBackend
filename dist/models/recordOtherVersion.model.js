"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecordOtherVersion = exports.RecordStatus = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../infrastructure/database/sequelize");
var RecordStatus;
(function (RecordStatus) {
    RecordStatus["DRAFT"] = "draft";
    RecordStatus["PENDING"] = "pending";
    RecordStatus["APPROVED"] = "approved";
    RecordStatus["REJECTED"] = "rejected";
    RecordStatus["ARCHIVED"] = "archived";
})(RecordStatus || (exports.RecordStatus = RecordStatus = {}));
class RecordOtherVersion extends sequelize_1.Model {
}
exports.RecordOtherVersion = RecordOtherVersion;
RecordOtherVersion.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    originalRecordId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        field: 'original_record_id',
    },
    title: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    cabinetId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        field: 'cabinet_id',
    },
    creatorId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        field: 'creator_id',
    },
    filePath: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        field: 'file_path',
    },
    fileName: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        field: 'file_name',
    },
    fileSize: {
        type: sequelize_1.DataTypes.BIGINT,
        allowNull: true,
        field: 'file_size',
    },
    fileType: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        field: 'file_type',
    },
    fileHash: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        field: 'file_hash',
    },
    version: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
    },
    status: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(RecordStatus)),
        allowNull: false,
        defaultValue: RecordStatus.DRAFT,
    },
    metadata: {
        type: sequelize_1.DataTypes.JSONB,
        allowNull: true,
    },
    customFields: {
        type: sequelize_1.DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
        field: 'custom_fields',
    },
    tags: {
        type: sequelize_1.DataTypes.ARRAY(sequelize_1.DataTypes.STRING),
        allowNull: false,
        defaultValue: [],
    },
    isTemplate: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_template',
    },
    isActive: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_active',
    },
    lastModifiedBy: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        field: 'last_modified_by',
    },
    createdAt: '',
    updatedAt: ''
}, {
    sequelize: sequelize_2.sequelize,
    tableName: 'records_other_versions',
    modelName: 'RecordOtherVersion',
    paranoid: true,
    timestamps: true,
});
exports.default = RecordOtherVersion;
