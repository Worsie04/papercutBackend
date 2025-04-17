"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cabinet = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../infrastructure/database/sequelize");
class Cabinet extends sequelize_1.Model {
}
exports.Cabinet = Cabinet;
Cabinet.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    company: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    spaceId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        field: 'space_id',
        references: {
            model: 'spaces',
            key: 'id',
        },
    },
    parentId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
        field: 'parent_id',
        references: {
            model: 'cabinets',
            key: 'id',
        },
    },
    tags: {
        type: sequelize_1.DataTypes.ARRAY(sequelize_1.DataTypes.STRING),
        allowNull: false,
        defaultValue: [],
    },
    metadata: {
        type: sequelize_1.DataTypes.JSONB,
        allowNull: true,
    },
    settings: {
        type: sequelize_1.DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
    },
    customFields: {
        type: sequelize_1.DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
        field: 'custom_fields',
    },
    memberIds: {
        type: sequelize_1.DataTypes.ARRAY(sequelize_1.DataTypes.STRING),
        allowNull: false,
        defaultValue: [],
        field: 'members',
    },
    approvers: {
        type: sequelize_1.DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
    },
    approverNote: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
        field: 'approver_note',
    },
    isActive: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_active',
    },
    createdById: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        field: 'created_by_id',
        references: {
            model: 'users',
            key: 'id',
        },
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
    },
    rejectionReason: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
        field: 'rejection_reason',
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
    tableName: 'cabinets',
    paranoid: true,
});
exports.default = Cabinet;
