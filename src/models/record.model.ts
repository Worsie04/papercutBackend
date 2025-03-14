import { DataTypes, BelongsToGetAssociationMixin } from 'sequelize';
import { BaseModel, baseModelConfig } from './base.model';
import { sequelize } from '../infrastructure/database/sequelize';
import { Cabinet } from './cabinet.model';

export enum RecordStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ARCHIVED = 'archived',
}

export class Record extends BaseModel {
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

  // Add cabinet association
  public getCabinet!: BelongsToGetAssociationMixin<Cabinet>;
  public readonly cabinet?: Cabinet;

  // Helper methods
  public async incrementVersion(): Promise<void> {
    this.version += 1;
    await this.save();
  }

  public async updateStatus(status: RecordStatus, userId: string): Promise<void> {
    this.status = status;
    this.lastModifiedBy = userId;
    await this.save();
  }

  public async addTag(tag: string): Promise<void> {
    if (!this.tags.includes(tag)) {
      this.tags = [...this.tags, tag];
      await this.save();
    }
  }

  public async removeTag(tag: string): Promise<void> {
    this.tags = this.tags.filter(t => t !== tag);
    await this.save();
  }
}

Record.init(
  {
    ...baseModelConfig,
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
      references: {
        model: 'cabinets',
        key: 'id',
      },
      field: 'cabinet_id',
    },
    creatorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
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
      references: {
        model: 'users',
        key: 'id',
      },
      field: 'last_modified_by',
    },
  },
  {
    sequelize,
    modelName: 'Record',
    tableName: 'records',
    paranoid: true,
  }
);
