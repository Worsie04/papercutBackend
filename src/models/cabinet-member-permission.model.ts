import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../infrastructure/database/sequelize';
import { User } from './user.model';
import { Cabinet } from './cabinet.model';

export class CabinetMemberPermission extends Model {
  public id!: string;
  public userId!: string;
  public cabinetId!: string;
  public role!: string;
  public permissions!: {
    readRecords: boolean;
    createRecords: boolean;
    updateRecords: boolean;
    deleteRecords: boolean;
    manageCabinet: boolean;
    downloadFiles: boolean;
    exportTables: boolean;
  };
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public deletedAt?: Date;
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
        model: User,
        key: 'id',
      },
    },
    cabinetId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'cabinet_id',
      references: {
        model: Cabinet,
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
    tableName: 'cabinet_member_permissions',
    paranoid: true,
    timestamps: true,
  }
);

// Define associations
CabinetMemberPermission.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

CabinetMemberPermission.belongsTo(Cabinet, {
  foreignKey: 'cabinetId',
  as: 'cabinet',
}); 