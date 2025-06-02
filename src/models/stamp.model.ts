import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../infrastructure/database/sequelize';

export enum StampType {
  UPLOADED = 'uploaded',
  PROCESSED = 'processed'
}

interface StampAttributes {
  id: string;
  userId: string;
  filename: string;
  storageKey: string;
  publicUrl: string;
  size?: number;
  mimeType?: string;
  stampType: StampType;
  createdAt: Date;
  updatedAt: Date;
}

interface StampCreationAttributes extends Optional<StampAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class Stamp extends Model<StampAttributes, StampCreationAttributes> implements StampAttributes {
  public id!: string;
  public userId!: string;
  public filename!: string;
  public storageKey!: string;
  public publicUrl!: string;
  public size?: number;
  public mimeType?: string;
  public stampType!: StampType;

  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Stamp.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    storageKey: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'storage_key',
    },
    publicUrl: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'public_url',
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'mime_type',
    },
    stampType: {
      type: DataTypes.ENUM(...Object.values(StampType)),
      allowNull: false,
      defaultValue: StampType.UPLOADED,
      field: 'stamp_type',
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
    modelName: 'Stamp',
    tableName: 'stamps',
    underscored: true,
    timestamps: true,
  }
); 