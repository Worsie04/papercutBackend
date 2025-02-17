import { DataTypes } from 'sequelize';
import { BaseModel, baseModelConfig } from './base.model';
import { sequelize } from '../infrastructure/database/sequelize';
import { User } from './user.model';

export enum SpaceType {
  PERSONAL = 'personal',
  CORPORATE = 'corporate',
}

export class Space extends BaseModel {
  public name!: string;
  public description?: string;
  public type!: SpaceType;
  public ownerId!: string;
  public createdById!: string;
  public company?: string;
  public tags!: string[];
  public country!: string;
  public logo?: string;
  public requireApproval!: boolean;
  public settings!: any;
  public metadata?: any;
  public storageQuota!: number;
  public usedStorage!: number;
  public isActive!: boolean;
  public status!: 'pending' | 'approved' | 'rejected';
  public rejectionReason?: string;

  // Association methods
  public readonly members?: User[];
  public readonly owner?: User;
  public addMember!: (user: User, options?: any) => Promise<void>;
  public removeMember!: (userId: string) => Promise<boolean>;
}

Space.init(
  {
    ...baseModelConfig,
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM(...Object.values(SpaceType)),
      allowNull: false,
      defaultValue: SpaceType.CORPORATE,
    },
    ownerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      field: 'owner_id',
    },
    createdById: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      field: 'created_by_id',
    },
    company: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
    },
    country: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    logo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    requireApproval: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'require_approval',
    },
    settings: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    storageQuota: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 5 * 1024 * 1024 * 1024, // 5GB default
      field: 'storage_quota',
    },
    usedStorage: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
      field: 'used_storage',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'rejection_reason',
    },
  },
  {
    sequelize,
    modelName: 'Space',
    tableName: 'spaces',
    paranoid: true,
  }
); 