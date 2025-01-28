"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cabinet = void 0;
const sequelize_1 = require("sequelize");
const base_model_1 = require("./base.model");
const sequelize_2 = require("../infrastructure/database/sequelize");
class Cabinet extends base_model_1.BaseModel {
}
exports.Cabinet = Cabinet;
Cabinet.init(Object.assign(Object.assign({}, base_model_1.baseModelConfig), { name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    }, company: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    }, description: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    }, spaceId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'spaces',
            key: 'id',
        },
    }, parentId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'cabinets',
            key: 'id',
        },
    }, tags: {
        type: sequelize_1.DataTypes.ARRAY(sequelize_1.DataTypes.STRING),
        allowNull: false,
        defaultValue: [],
    }, metadata: {
        type: sequelize_1.DataTypes.JSONB,
        allowNull: true,
    }, settings: {
        type: sequelize_1.DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
    }, customFields: {
        type: sequelize_1.DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
    }, members: {
        type: sequelize_1.DataTypes.ARRAY(sequelize_1.DataTypes.UUID),
        allowNull: false,
        defaultValue: [],
    }, approvers: {
        type: sequelize_1.DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
    }, approverNote: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    }, isActive: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    }, createdById: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
        field: 'created_by_id',
    }, status: {
        type: sequelize_1.DataTypes.ENUM('pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
    }, rejectionReason: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    } }), {
    sequelize: sequelize_2.sequelize,
    modelName: 'Cabinet',
    tableName: 'cabinets',
    paranoid: true,
});
