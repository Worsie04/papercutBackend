"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CabinetMemberPermission = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../infrastructure/database/sequelize");
const user_model_1 = require("./user.model");
const cabinet_model_1 = require("./cabinet.model");
class CabinetMemberPermission extends sequelize_1.Model {
}
exports.CabinetMemberPermission = CabinetMemberPermission;
CabinetMemberPermission.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        field: 'user_id',
        references: {
            model: user_model_1.User,
            key: 'id',
        },
    },
    cabinetId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        field: 'cabinet_id',
        references: {
            model: cabinet_model_1.Cabinet,
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
        field: 'created_at',
    },
    updatedAt: {
        type: sequelize_1.DataTypes.DATE,
        field: 'updated_at',
    },
    deletedAt: {
        type: sequelize_1.DataTypes.DATE,
        field: 'deleted_at',
    },
}, {
    sequelize: sequelize_2.sequelize,
    tableName: 'cabinet_member_permissions',
    paranoid: true,
    timestamps: true,
});
// Define associations
CabinetMemberPermission.belongsTo(user_model_1.User, {
    foreignKey: 'userId',
    as: 'user',
});
CabinetMemberPermission.belongsTo(cabinet_model_1.Cabinet, {
    foreignKey: 'cabinetId',
    as: 'cabinet',
});
