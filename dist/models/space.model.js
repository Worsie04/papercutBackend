"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Space = exports.SpaceType = void 0;
const sequelize_1 = require("sequelize");
const base_model_1 = require("./base.model");
const sequelize_2 = require("../infrastructure/database/sequelize");
var SpaceType;
(function (SpaceType) {
    SpaceType["PERSONAL"] = "personal";
    SpaceType["CORPORATE"] = "corporate";
})(SpaceType || (exports.SpaceType = SpaceType = {}));
class Space extends base_model_1.BaseModel {
}
exports.Space = Space;
Space.init(Object.assign(Object.assign({}, base_model_1.baseModelConfig), { name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    }, description: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    }, type: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(SpaceType)),
        allowNull: false,
        defaultValue: SpaceType.CORPORATE,
    }, ownerId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
        field: 'owner_id',
    }, createdById: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
        field: 'created_by_id',
    }, company: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    }, tags: {
        type: sequelize_1.DataTypes.ARRAY(sequelize_1.DataTypes.STRING),
        allowNull: false,
        defaultValue: [],
    }, country: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    }, logo: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    }, requireApproval: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'require_approval',
    }, approvers: {
        type: sequelize_1.DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
    }, settings: {
        type: sequelize_1.DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
    }, metadata: {
        type: sequelize_1.DataTypes.JSONB,
        allowNull: true,
    }, storageQuota: {
        type: sequelize_1.DataTypes.BIGINT,
        allowNull: false,
        defaultValue: 5 * 1024 * 1024 * 1024, // 5GB default
        field: 'storage_quota',
    }, usedStorage: {
        type: sequelize_1.DataTypes.BIGINT,
        allowNull: false,
        defaultValue: 0,
        field: 'used_storage',
    }, isActive: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_active',
    }, status: {
        type: sequelize_1.DataTypes.ENUM('pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
    }, rejectionReason: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
        field: 'rejection_reason',
    }, rejectedBy: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id',
        },
        field: 'rejected_by',
    } }), {
    sequelize: sequelize_2.sequelize,
    modelName: 'Space',
    tableName: 'spaces',
    paranoid: true,
});
