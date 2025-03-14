import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../infrastructure/database/sequelize'

interface FileAttributes {
  id: string;
  name: string;
  originalName: string;
  path: string;
  type: string;
  size: number;
  isAllocated: boolean; // whether file is allocated to a record
  userId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FileInput extends Optional<FileAttributes, 'id'> {}
export interface FileOutput extends Required<FileAttributes> {}

class File extends Model<FileAttributes, FileInput> implements FileAttributes {
  public id!: string;
  public name!: string;
  public originalName!: string;
  public path!: string;
  public type!: string;
  public size!: number;
  public isAllocated!: boolean;
  public userId!: string;
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

File.init(
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
    originalName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    path: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    isAllocated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  },
  {
    tableName: 'files',
    sequelize,
    timestamps: true,
  }
);

export default File;