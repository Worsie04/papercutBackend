import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../infrastructure/database/sequelize';

interface RecordFileAttributes {
  id: string;
  recordId: string;
  fileId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

class RecordFile extends Model<RecordFileAttributes> implements RecordFileAttributes {
  public id!: string;
  public recordId!: string;
  public fileId!: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

RecordFile.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    recordId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'records',
        key: 'id',
      },
      field: 'record_id',
    },
    fileId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'files',
        key: 'id',
      },
      field: 'file_id',
    },
  },
  {
    tableName: 'record_files',
    sequelize,
    timestamps: true,
  }
);

export default RecordFile;