import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../infrastructure/database/sequelize';
import { User } from './user.model';
import { Organization } from './organization.model';

interface GroupInstance {
  $get: (key: string, options?: any) => Promise<any>;
  $add: (key: string, value: any, options?: any) => Promise<any>;
  $remove: (key: string, value: any, options?: any) => Promise<any>;
}

export class Group extends Model implements GroupInstance {
  public id!: string;
  public name!: string;
  public description?: string;
  public organizationId!: string;
  public createdBy!: string;
  public membersCount!: number;
  public permissions!: {
    readRecords: boolean;
    manageCabinet: boolean;
    downloadFiles: boolean;
    exportTables: boolean;
  };
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public deletedAt?: Date;

  public $get!: (key: string, options?: any) => Promise<any>;
  public $add!: (key: string, value: any, options?: any) => Promise<any>;
  public $remove!: (key: string, value: any, options?: any) => Promise<any>;
}

Group.init(
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
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    organizationId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'organization_id',
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'created_by',
    },
    membersCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'members_count',
    },
    permissions: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        readRecords: false,
        manageCabinet: false,
        downloadFiles: false,
        exportTables: false,
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at',
    },
    deletedAt: {
      type: DataTypes.DATE,
      field: 'deleted_at',
    },
  },
  {
    sequelize,
    tableName: 'groups',
    paranoid: true,
    timestamps: true,
  }
); 