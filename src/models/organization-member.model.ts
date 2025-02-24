import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../infrastructure/database/sequelize';

export interface CustomPermissions {
  canCreateSpaces?: boolean;
  canApproveSpaces?: boolean;
  canInviteMembers?: boolean;
  canManageRoles?: boolean;
  canDownloadFiles?: boolean;
  canEditFields?: string[];
  restrictedFields?: string[];
}

export class OrganizationMember extends Model {
  public id!: string;
  public organizationId!: string;
  public userId!: string;
  public userType!: 'user' | 'admin';
  public role!: 'owner' | 'member_full' | 'member_read' | 'co_owner' | 'system_admin' | 'super_user' | 'guest';
  public customPermissions?: CustomPermissions;
  public invitedBy?: string;
  public status!: 'pending' | 'active' | 'suspended';
  public expiresAt?: Date;
  public createdAt!: Date;
  public updatedAt!: Date;

  // Helper methods
  public hasPermission(permission: keyof CustomPermissions): boolean {
    if (this.role === 'owner' || this.role === 'co_owner' || this.role === 'system_admin' || this.role === 'super_user') return true;
    if (this.role === 'guest' || this.role === 'member_read') return false;
    if (this.role === 'member_full') {
      // Define default permissions for full members
      const defaultFullMemberPermissions: CustomPermissions = {
        canCreateSpaces: false,
        canApproveSpaces: false,
        canInviteMembers: true,
        canManageRoles: false,
        canDownloadFiles: true,
        canEditFields: ['*'],
        restrictedFields: []
      };
      if (permission === 'canEditFields' || permission === 'restrictedFields') {
        return (defaultFullMemberPermissions[permission]?.length ?? 0) > 0;
      }
      return defaultFullMemberPermissions[permission] as boolean || false;
    }
    return false;
  }

  public canAccessField(fieldName: string): boolean {
    if (this.role === 'owner' || this.role === 'co_owner' || this.role === 'system_admin' || this.role === 'super_user') return true;
    if (this.role === 'member_full') {
      return true;
    }
    return false;
  }
}

OrganizationMember.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    organizationId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'organization_id',
      references: {
        model: 'organizations',
        key: 'id',
      },
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    userType: {
      type: DataTypes.ENUM('user', 'admin'),
      allowNull: false,
      defaultValue: 'user',
      field: 'user_type',
    },
    role: {
      type: DataTypes.ENUM('owner', 'member_full', 'member_read', 'co_owner', 'system_admin', 'super_user', 'guest'),
      allowNull: false,
      defaultValue: 'member_full',
    },
    customPermissions: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'custom_permissions',
    },
    invitedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'invited_by',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    status: {
      type: DataTypes.ENUM('pending', 'active', 'suspended'),
      allowNull: false,
      defaultValue: 'active',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expires_at',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    modelName: 'OrganizationMember',
    tableName: 'organization_members',
    underscored: true,
  }
);

export function setupOrganizationMemberAssociations(): void {
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