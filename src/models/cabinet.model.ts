import { DataTypes } from 'sequelize';
import { BaseModel, baseModelConfig } from './base.model';
import { sequelize } from '../infrastructure/database/sequelize';
import { User } from './user.model';
import { BelongsToGetAssociationMixin } from 'sequelize';

export interface CustomField {
  id: number;
  name: string;
  type: string;
  isMandatory: boolean;
  isApiReady: boolean;
  duplication: 'Notify' | 'Deny' | 'Allow';
  source: string;
  selectedIcon: 'paperClip' | 'eye' | 'user' | null;
}

export interface CabinetApprover {
  userId: string;
  order: number;
}

export class Cabinet extends BaseModel {
  public name!: string;
  public company!: string;
  public description?: string;
  public spaceId!: string;
  public parentId?: string;
  public tags!: string[];
  public metadata?: any;
  public settings!: any;
  public customFields!: CustomField[];
  public members!: string[];
  public approvers!: CabinetApprover[];
  public approverNote?: string;
  public isActive!: boolean;
  public createdById!: string;
  public status!: 'pending' | 'approved' | 'rejected';
  public rejectionReason?: string;

  // Association methods
  public getCreatedBy!: BelongsToGetAssociationMixin<User>;
  public readonly createdBy?: User;
}

Cabinet.init(
  {
    ...baseModelConfig,
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    company: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    spaceId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'spaces',
        key: 'id',
      },
    },
    parentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'cabinets',
        key: 'id',
      },
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    settings: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    customFields: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    members: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      allowNull: false,
      defaultValue: [],
    },
    approvers: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    approverNote: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
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
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Cabinet',
    tableName: 'cabinets',
    paranoid: true,
  }
); 