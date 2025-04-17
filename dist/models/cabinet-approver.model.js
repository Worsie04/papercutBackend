"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CabinetApprover = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../infrastructure/database/sequelize");
const user_model_1 = require("./user.model");
const cabinet_model_1 = require("./cabinet.model");
class CabinetApprover extends sequelize_1.Model {
}
exports.CabinetApprover = CabinetApprover;
CabinetApprover.init({
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
            model: 'users',
            key: 'id',
        },
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
    order: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
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
    tableName: 'cabinet_approvers',
    paranoid: true,
    timestamps: true,
});
// Set up associations
CabinetApprover.belongsTo(user_model_1.User, {
    foreignKey: 'userId',
    as: 'user',
});
CabinetApprover.belongsTo(cabinet_model_1.Cabinet, {
    foreignKey: 'cabinetId',
    as: 'cabinet',
});
exports.default = CabinetApprover;
