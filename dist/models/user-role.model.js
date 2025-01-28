"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRole = void 0;
const sequelize_1 = require("sequelize");
const base_model_1 = require("./base.model");
const sequelize_2 = require("../infrastructure/database/sequelize");
class UserRole extends base_model_1.BaseModel {
}
exports.UserRole = UserRole;
UserRole.init(Object.assign(Object.assign({}, base_model_1.baseModelConfig), { userId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    }, roleId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'roles',
            key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    } }), {
    sequelize: sequelize_2.sequelize,
    modelName: 'UserRole',
    tableName: 'user_roles',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['userId', 'roleId'],
        },
    ],
});
