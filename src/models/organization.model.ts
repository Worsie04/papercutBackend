import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../infrastructure/database/sequelize';
import { User } from './user.model';
import { Admin } from './admin.model';
import { OrganizationMember, CustomPermissions } from './organization-member.model';

export class Organization extends Model {
  public id!: string;
  public name!: string;
  public type!: 'Personal' | 'Corporate';
  public description?: string;
  public logo?: string;
  public subscription!: 'Free' | 'Pro' | 'Enterprise';
  public visibility!: 'Public' | 'Private';
  public owner_id!: string;
  public owner_type!: 'user' | 'admin';
  public domain!: string;
  public createdAt!: Date;
  public updatedAt!: Date;

  // Associations
  public userOwner?: User;
  public adminOwner?: Admin;
  public members?: OrganizationMember[];
  

  // Helper method to get the appropriate owner
  public getOwner(): User | Admin | undefined {
    if (this.owner_type === 'user' && this.userOwner) {
      return this.userOwner;
    } else if (this.owner_type === 'admin' && this.adminOwner) {
      return this.adminOwner;
    }
    return undefined;
  }

  // Helper method to check if a user is a member
  public async isMember(userId: string): Promise<boolean> {
    const member = await OrganizationMember.findOne({
      where: {
        organizationId: this.id,
        userId,
        status: 'active'
      }
    });
    return !!member;
  }

  // Helper method to get a member's role
  public async getMemberRole(userId: string): Promise<string | null> {
    const member = await OrganizationMember.findOne({
      where: {
        organizationId: this.id,
        userId,
        status: 'active'
      }
    });
    return member ? member.role : null;
  }

  // Helper method to check if a user has a specific permission
  public async hasPermission(userId: string, permission: keyof CustomPermissions): Promise<boolean> {
    const member = await OrganizationMember.findOne({
      where: {
        organizationId: this.id,
        userId,
        status: 'active'
      }
    });
    return member ? member.hasPermission(permission) : false;
  }
}

Organization.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    type: {
      type: DataTypes.ENUM('Personal', 'Corporate'),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    logo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    subscription: {
      type: DataTypes.ENUM('Free', 'Pro', 'Enterprise'),
      allowNull: false,
      defaultValue: 'Free',
    },
    visibility: {
      type: DataTypes.ENUM('Public', 'Private'),
      allowNull: false,
      defaultValue: 'Private',
    },
    domain: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        is: /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/i,
      },
    },
    owner_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    owner_type: {
      type: DataTypes.ENUM('user', 'admin'),
      allowNull: false,
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
    modelName: 'Organization',
    tableName: 'organizations',
    underscored: true,
    timestamps: true,
    scopes: {
      withUserOwner: {
        include: [{
          model: User,
          as: 'userOwner',
          required: false,
          where: {
            '$Organization.owner_type$': 'user'
          }
        }]
      },
      withAdminOwner: {
        include: [{
          model: Admin,
          as: 'adminOwner',
          required: false,
          where: {
            '$Organization.owner_type$': 'admin'
          }
        }]
      },
      withMembers: {
        include: [{
          model: OrganizationMember,
          as: 'members',
          include: [{
            model: User,
            as: 'user'
          }]
        }]
      }
    }
  }
); 