import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../infrastructure/database/sequelize';

export class CabinetMemberPermission extends Model {
  public id!: string;
  public userId!: string;
  public cabinetId!: string;
  public cabinetMemberId!: string;
  public role!: string;
  public permissions!: object;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;
}

CabinetMemberPermission.init(
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
      references: {
        model: 'users',
        key: 'id',
      },
    },
    cabinetId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'cabinet_id',
      references: {
        model: 'cabinets',
        key: 'id',
      },
    },
    cabinetMemberId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'cabinet_member_id',
      references: {
        model: 'cabinet_members',
        key: 'id',
      },
    },
    role: {
      type: DataTypes.ENUM('member_full', 'member_read', 'member_write', 'admin'),
      defaultValue: 'member_full',
      allowNull: false,
    },
    permissions: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        readRecords: true,
        createRecords: false,
        updateRecords: false,
        deleteRecords: false,
        manageCabinet: false,
        downloadFiles: true,
        exportTables: false,
      },
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
    tableName: 'cabinet_member_permissions',
    paranoid: true,
  }
);

export default CabinetMemberPermission; 