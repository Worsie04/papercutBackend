import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../infrastructure/database/sequelize';
import { Record } from './record.model';

export interface PdfFileAttributes {
  id?: string;
  recordId: string;
  originalFileName: string;
  filePath: string;
  fileSize: number;
  fileHash: string;
  pageCount?: number;
  extractedText?: string;
  extractedMetadata?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export class PdfFile extends Model<PdfFileAttributes> implements PdfFileAttributes {
  public id!: string;
  public recordId!: string;
  public originalFileName!: string;
  public filePath!: string;
  public fileSize!: number;
  public fileHash!: string;
  public pageCount?: number;
  public extractedText?: string;
  public extractedMetadata?: any;
  public createdAt!: Date;
  public updatedAt!: Date;
}

PdfFile.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    recordId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'records',
        key: 'id'
      },
      field: 'record_id' // Map to snake_case column name
    },
    originalFileName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'original_file_name' // Map to snake_case column name
    },
    filePath: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'file_path' // Map to snake_case column name
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'file_size' // Map to snake_case column name
    },
    fileHash: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'file_hash' // Map to snake_case column name
    },
    pageCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'page_count' // Map to snake_case column name
    },
    extractedText: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'extracted_text' // Map to snake_case column name
    },
    extractedMetadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'extracted_metadata' // Map to snake_case column name
    }
  },
  {
    sequelize,
    tableName: 'pdf_files',
    timestamps: true,
    underscored: true // This tells Sequelize that column names are snake_case
  }
);

// Define associations
export function initPdfFileAssociations() {
  PdfFile.belongsTo(Record, { foreignKey: 'recordId', as: 'record' });
  Record.hasOne(PdfFile, { foreignKey: 'recordId', as: 'pdfFile' });
}