import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../infrastructure/database/sequelize';
import { User } from './user.model';

export interface CabinetApprover {
  userId: string;
  order: number;
}

export interface CustomField {
  [x: string]: any;
  name: string;
  type: string;
  required: boolean;
  options?: string[];
}

export class Cabinet extends Model {
  public id!: string;
  public name!: string;
  public company!: string;
  public description?: string;
  public spaceId!: string;
  public parentId?: string;
  public tags!: string[];
  public metadata?: any;
  public settings!: any;
  public customFields!: CustomField[];
  public memberIds!: string[];
  public approvers!: CabinetApprover[];
  public approverNote?: string;
  public isActive!: boolean;
  public createdById!: string;
  public status!: 'pending' | 'approved' | 'rejected';
  public rejectionReason?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;

  // Associations
  public readonly creator?: User;
  public readonly cabinetUsers?: User[];
}

Cabinet.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
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
      field: 'space_id',
      references: {
        model: 'spaces',
        key: 'id',
      },
    },
    parentId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'parent_id',
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
      field: 'custom_fields',
    },
    memberIds: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
      field: 'members',
    },
    approvers: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    approverNote: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'approver_note',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    createdById: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'created_by_id',
      references: {
        model: 'users',
        key: 'id',
      },
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
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at',
    },
  },
  {
    sequelize,
    tableName: 'cabinets',
    paranoid: true,
  }
);



export default Cabinet; 