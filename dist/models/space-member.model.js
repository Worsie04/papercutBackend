"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpaceMember = void 0;
const sequelize_1 = require("sequelize");
const base_model_1 = require("./base.model");
const sequelize_2 = require("../infrastructure/database/sequelize");
class SpaceMember extends base_model_1.BaseModel {
}
exports.SpaceMember = SpaceMember;
SpaceMember.init(Object.assign(Object.assign({}, base_model_1.baseModelConfig), { spaceId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        field: 'space_id',
        references: {
            model: 'spaces',
            key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    }, userId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        field: 'user_id',
        references: {
            model: 'users',
            key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    }, role: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        defaultValue: 'member',
    }, permissions: {
        type: sequelize_1.DataTypes.ARRAY(sequelize_1.DataTypes.STRING),
        allowNull: false,
        defaultValue: [],
    }, createdAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
        defaultValue: sequelize_1.DataTypes.NOW,
    }, updatedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        field: 'updated_at',
        defaultValue: sequelize_1.DataTypes.NOW,
    } }), {
    sequelize: sequelize_2.sequelize,
    modelName: 'SpaceMember',
    tableName: 'space_members',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['space_id', 'user_id'],
        },
    ],
});
