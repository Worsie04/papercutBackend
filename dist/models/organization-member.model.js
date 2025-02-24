"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationMember = void 0;
exports.setupOrganizationMemberAssociations = setupOrganizationMemberAssociations;
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../infrastructure/database/sequelize");
class OrganizationMember extends sequelize_1.Model {
    // Helper methods
    hasPermission(permission) {
        var _a, _b;
        if (this.role === 'owner' || this.role === 'co_owner' || this.role === 'system_admin' || this.role === 'super_user')
            return true;
        if (this.role === 'guest' || this.role === 'member_read')
            return false;
        if (this.role === 'member_full') {
            // Define default permissions for full members
            const defaultFullMemberPermissions = {
                canCreateSpaces: false,
                canApproveSpaces: false,
                canInviteMembers: true,
                canManageRoles: false,
                canDownloadFiles: true,
                canEditFields: ['*'],
                restrictedFields: []
            };
            if (permission === 'canEditFields' || permission === 'restrictedFields') {
                return ((_b = (_a = defaultFullMemberPermissions[permission]) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0) > 0;
            }
            return defaultFullMemberPermissions[permission] || false;
        }
        return false;
    }
    canAccessField(fieldName) {
        if (this.role === 'owner' || this.role === 'co_owner' || this.role === 'system_admin' || this.role === 'super_user')
            return true;
        if (this.role === 'member_full') {
            return true;
        }
        return false;
    }
}
exports.OrganizationMember = OrganizationMember;
OrganizationMember.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    organizationId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        field: 'organization_id',
        references: {
            model: 'organizations',
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
    userType: {
        type: sequelize_1.DataTypes.ENUM('user', 'admin'),
        allowNull: false,
        defaultValue: 'user',
        field: 'user_type',
    },
    role: {
        type: sequelize_1.DataTypes.ENUM('owner', 'member_full', 'member_read', 'co_owner', 'system_admin', 'super_user', 'guest'),
        allowNull: false,
        defaultValue: 'member_full',
    },
    customPermissions: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: true,
        field: 'custom_permissions',
    },
    invitedBy: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
        field: 'invited_by',
        references: {
            model: 'users',
            key: 'id',
        },
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('pending', 'active', 'suspended'),
        allowNull: false,
        defaultValue: 'active',
    },
    expiresAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        field: 'expires_at',
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
}, {
    sequelize: sequelize_2.sequelize,
    modelName: 'OrganizationMember',
    tableName: 'organization_members',
    underscored: true,
});
function setupOrganizationMemberAssociations() {
    // Import models here to avoid circular dependencies
    const { User } = require('./user.model');
    const { Organization } = require('./organization.model');
    OrganizationMember.belongsTo(User, {
        foreignKey: 'userId',
        as: 'user'
    });
    OrganizationMember.belongsTo(Organization, {
        foreignKey: 'organizationId',
        as: 'organization'
    });
    OrganizationMember.belongsTo(User, {
        foreignKey: 'invitedBy',
        as: 'inviter'
    });
}
