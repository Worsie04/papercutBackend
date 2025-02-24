"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Group = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../infrastructure/database/sequelize");
const user_model_1 = require("./user.model");
const organization_model_1 = require("./organization.model");
class Group extends sequelize_1.Model {
}
exports.Group = Group;
Group.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    organizationId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        field: 'organization_id',
    },
    createdBy: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        field: 'created_by',
    },
    membersCount: {
        type: sequelize_1.DataTypes.INTEGER,
        defaultValue: 0,
        field: 'members_count',
    },
    permissions: {
        type: sequelize_1.DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
            readRecords: false,
            manageCabinet: false,
            downloadFiles: false,
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
    tableName: 'groups',
    paranoid: true,
    timestamps: true,
});
// Define associations
Group.belongsTo(organization_model_1.Organization, {
    foreignKey: 'organizationId',
    as: 'organization',
});
Group.belongsTo(user_model_1.User, {
    foreignKey: 'createdBy',
    as: 'creator',
});
Group.belongsToMany(user_model_1.User, {
    through: 'group_members',
    foreignKey: 'groupId',
    otherKey: 'userId',
    as: 'members',
});
