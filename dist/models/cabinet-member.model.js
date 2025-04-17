"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CabinetMember = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../infrastructure/database/sequelize");
class CabinetMember extends sequelize_1.Model {
}
exports.CabinetMember = CabinetMember;
CabinetMember.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    cabinetId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        field: 'cabinet_id',
        references: {
            model: 'cabinets',
            key: 'id',
        },
    },
    userId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        field: 'user_id',
        references: {
            model: 'users',
            key: 'id',
        },
    },
    role: {
        type: sequelize_1.DataTypes.ENUM('member_full', 'member_read', 'member_write', 'admin'),
        defaultValue: 'member_full',
        allowNull: false,
    },
    permissions: {
        type: sequelize_1.DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
            readRecords: true,
            createRecords: false,
            updateRecords: false,
            deleteRecords: false,
            manageCabinet: false,
            downloadFiles: true,
            exportTables: false,
        },
    },
    createdAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
    },
    updatedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        field: 'updated_at',
    },
    deletedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        field: 'deleted_at',
    },
}, {
    sequelize: sequelize_2.sequelize,
    tableName: 'cabinet_members',
    paranoid: true,
});
exports.default = CabinetMember;
