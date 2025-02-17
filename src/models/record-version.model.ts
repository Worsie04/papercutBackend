import { DataTypes } from 'sequelize';
import { BaseModel, baseModelConfig } from './base.model';
import { sequelize } from '../infrastructure/database/sequelize';
import { Record } from './record.model';

export class RecordVersion extends BaseModel {
  public recordId!: string;
  public version!: number;
  public filePath!: string;
  public fileName!: string;
  public fileSize!: number;
  public fileType!: string;
  public fileHash!: string;
  public uploadedBy!: string;
  public note?: string;
}

RecordVersion.init(
  {
    ...baseModelConfig,
    recordId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'records',
        key: 'id',
      },
      field: 'record_id',
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    filePath: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'file_path',
    },
    fileName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'file_name',
    },
    fileSize: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'file_size',
    },
    fileType: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'file_type',
    },
    fileHash: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'file_hash',
    },
    uploadedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      field: 'uploaded_by',
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'RecordVersion',
    tableName: 'record_versions',
    paranoid: true,
  }
);

// Set up associations
Record.hasMany(RecordVersion, {
  foreignKey: 'recordId',
  as: 'versions',
});

RecordVersion.belongsTo(Record, {
  foreignKey: 'recordId',
  as: 'record',
}); 