import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../infrastructure/database/sequelize';

export enum RecordStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ARCHIVED = 'archived',
}

interface RecordOtherVersionAttributes {
  id: string;
  originalRecordId: string;
  title: string;
  description?: string;
  cabinetId: string;
  creatorId: string;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  fileHash?: string;
  version: number;
  status: RecordStatus;
  metadata?: any;
  customFields: any;
  tags: string[];
  isTemplate: boolean;
  isActive: boolean;
  lastModifiedBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

interface RecordOtherVersionCreationAttributes
  extends Optional<
    RecordOtherVersionAttributes,
    | 'id'
    | 'version'
    | 'status'
    | 'metadata'
    | 'customFields'
    | 'tags'
    | 'isTemplate'
    | 'isActive'
    | 'createdAt'
    | 'updatedAt'
    | 'deletedAt'
  > {}


export class RecordOtherVersion
  extends Model<RecordOtherVersionAttributes, RecordOtherVersionCreationAttributes>
  implements RecordOtherVersionAttributes
{
  public id!: string;
  public originalRecordId!: string;
  public title!: string;
  public description?: string;
  public cabinetId!: string;
  public creatorId!: string;
  public filePath?: string;
  public fileName?: string;
  public fileSize?: number;
  public fileType?: string;
  public fileHash?: string;
  public version!: number;
  public status!: RecordStatus;
  public metadata?: any;
  public customFields!: any;
  public tags!: string[];
  public isTemplate!: boolean;
  public isActive!: boolean;
  public lastModifiedBy!: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt?: Date;
}

RecordOtherVersion.init(
  {
      id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
      },
      originalRecordId: {
          type: DataTypes.UUID,
          allowNull: false,
          field: 'original_record_id',
      },
      title: {
          type: DataTypes.STRING,
          allowNull: false,
      },
      description: {
          type: DataTypes.TEXT,
          allowNull: true,
      },
      cabinetId: {
          type: DataTypes.UUID,
          allowNull: false,
          field: 'cabinet_id',
      },
      creatorId: {
          type: DataTypes.UUID,
          allowNull: false,
          field: 'creator_id',
      },
      filePath: {
          type: DataTypes.STRING,
          allowNull: true,
          field: 'file_path',
      },
      fileName: {
          type: DataTypes.STRING,
          allowNull: true,
          field: 'file_name',
      },
      fileSize: {
          type: DataTypes.BIGINT,
          allowNull: true,
          field: 'file_size',
      },
      fileType: {
          type: DataTypes.STRING,
          allowNull: true,
          field: 'file_type',
      },
      fileHash: {
          type: DataTypes.STRING,
          allowNull: true,
          field: 'file_hash',
      },
      version: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 1,
      },
      status: {
          type: DataTypes.ENUM(...Object.values(RecordStatus)),
          allowNull: false,
          defaultValue: RecordStatus.DRAFT,
      },
      metadata: {
          type: DataTypes.JSONB,
          allowNull: true,
      },
      customFields: {
          type: DataTypes.JSONB,
          allowNull: false,
          defaultValue: {},
          field: 'custom_fields',
      },
      tags: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: false,
          defaultValue: [],
      },
      isTemplate: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: 'is_template',
      },
      isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          field: 'is_active',
      },
      lastModifiedBy: {
          type: DataTypes.UUID,
          allowNull: false,
          field: 'last_modified_by',
      },
      createdAt: '',
      updatedAt: ''
  },
  {
    sequelize,
    tableName: 'records_other_versions',
    modelName: 'RecordOtherVersion',
    paranoid: true,
    timestamps: true,
  }
);

export default RecordOtherVersion;
