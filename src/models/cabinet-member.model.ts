import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../infrastructure/database/sequelize';
import { Cabinet } from './cabinet.model';
import { User } from './user.model';
import { CabinetMemberPermission } from './cabinet-member-permission.model';

export interface CabinetMemberPermissions {
  readRecords: boolean;
  createRecords: boolean;
  updateRecords: boolean;
  deleteRecords: boolean;
  manageCabinet: boolean;
  downloadFiles: boolean;
  exportTables: boolean;
}

export class CabinetMember extends Model {
  public id!: string;
  public cabinetId!: string;
  public userId!: string;
  public role!: 'owner' | 'member' | 'viewer';
  public permissions!: CabinetMemberPermissions;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt?: Date;

  // Associations
  public cabinet?: Cabinet;
  public user?: User;
  public memberPermissions?: CabinetMemberPermission;
}

CabinetMember.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
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
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    role: {
      type: DataTypes.ENUM('owner', 'member', 'viewer'),
      allowNull: false,
      defaultValue: 'member',
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
        exportTables: false
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
    modelName: 'CabinetMember',
    tableName: 'cabinet_members',
    underscored: true,
    paranoid: true,
  }
);

// Set up associations
CabinetMember.belongsTo(Cabinet, {
  foreignKey: 'cabinetId',
  as: 'cabinet',
});

CabinetMember.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

Cabinet.belongsToMany(User, {
  through: CabinetMember,
  foreignKey: 'cabinetId',
  otherKey: 'userId',
  as: 'users',
});

User.belongsToMany(Cabinet, {
  through: CabinetMember,
  foreignKey: 'userId',
  otherKey: 'cabinetId',
  as: 'cabinets',
});

// Change the association name from 'permissions' to 'memberPermissions'
CabinetMember.hasOne(CabinetMemberPermission, {
  foreignKey: 'cabinetId',
  sourceKey: 'cabinetId',
  as: 'memberPermissions',
  constraints: false
}); 