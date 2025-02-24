"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CabinetMember = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../infrastructure/database/sequelize");
const cabinet_model_1 = require("./cabinet.model");
const user_model_1 = require("./user.model");
const cabinet_member_permission_model_1 = require("./cabinet-member-permission.model");
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
        type: sequelize_1.DataTypes.ENUM('owner', 'member', 'viewer'),
        allowNull: false,
        defaultValue: 'member',
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
            exportTables: false
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
    modelName: 'CabinetMember',
    tableName: 'cabinet_members',
    underscored: true,
    paranoid: true,
});
// Set up associations
CabinetMember.belongsTo(cabinet_model_1.Cabinet, {
    foreignKey: 'cabinetId',
    as: 'cabinet',
});
CabinetMember.belongsTo(user_model_1.User, {
    foreignKey: 'userId',
    as: 'user',
});
cabinet_model_1.Cabinet.belongsToMany(user_model_1.User, {
    through: CabinetMember,
    foreignKey: 'cabinetId',
    otherKey: 'userId',
    as: 'users',
});
user_model_1.User.belongsToMany(cabinet_model_1.Cabinet, {
    through: CabinetMember,
    foreignKey: 'userId',
    otherKey: 'cabinetId',
    as: 'cabinets',
});
// Change the association name from 'permissions' to 'memberPermissions'
CabinetMember.hasOne(cabinet_member_permission_model_1.CabinetMemberPermission, {
    foreignKey: 'cabinetId',
    sourceKey: 'cabinetId',
    as: 'memberPermissions',
    constraints: false
});
