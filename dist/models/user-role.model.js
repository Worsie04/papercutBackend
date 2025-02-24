"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRole = void 0;
const sequelize_1 = require("sequelize");
const base_model_1 = require("./base.model");
const sequelize_2 = require("../infrastructure/database/sequelize");
class UserRole extends base_model_1.BaseModel {
}
exports.UserRole = UserRole;
UserRole.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
        field: 'id'
    },
    userId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        field: 'user_id',
        references: {
            model: 'users',
            key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    },
    roleId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        field: 'role_id',
        references: {
            model: 'roles',
            key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    },
    createdAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        field: 'created_at'
    },
    updatedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        field: 'updated_at'
    },
    deletedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        field: 'deleted_at'
    }
}, {
    sequelize: sequelize_2.sequelize,
    modelName: 'UserRole',
    tableName: 'user_roles',
    timestamps: true,
    paranoid: true,
    indexes: [
        {
            unique: true,
            fields: ['user_id', 'role_id'],
            name: 'unique_user_role'
        },
    ],
});
