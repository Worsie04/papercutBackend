import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../infrastructure/database/sequelize';
import { User } from './user.model';
import { Cabinet } from './cabinet.model';

interface CabinetReassignmentAttributes {
  id: string;
  cabinetId: string;
  fromUserId: string;
  toUserId: string;
  message?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CabinetReassignmentCreationAttributes
  extends Optional<CabinetReassignmentAttributes, 'id' | 'createdAt' | 'updatedAt' | 'message'> {}

export class CabinetReassignment extends Model<
  CabinetReassignmentAttributes,
  CabinetReassignmentCreationAttributes
> implements CabinetReassignmentAttributes {
  declare id: string;
  declare cabinetId: string;
  declare fromUserId: string;
  declare toUserId: string;
  declare message?: string;
  declare createdAt: Date;
  declare updatedAt: Date;

  // Optional associations
  declare cabinet?: Cabinet;
  declare fromUser?: User;
  declare toUser?: User;
}

CabinetReassignment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
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
    fromUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      field: 'from_user_id',
    },
    toUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      field: 'to_user_id',
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
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
    tableName: 'cabinet_reassignments',
    modelName: 'CabinetReassignment',
    underscored: true,
    timestamps: true,
  }
);
