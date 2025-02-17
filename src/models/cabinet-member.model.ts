import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../infrastructure/database/sequelize';
import { Cabinet } from './cabinet.model';
import { User } from './user.model';
import { CabinetMemberPermission } from './cabinet-member-permission.model';

export interface CabinetMemberPermissions {
  role: string;
  permissions: {
    readRecords: boolean;
    createRecords: boolean;
    updateRecords: boolean;
    deleteRecords: boolean;
    manageCabinet: boolean;
    downloadFiles: boolean;
    exportTables: boolean;
  };
}

export class CabinetMember extends Model {
  public cabinetId!: string;
  public userId!: string;
  public role!: string;
  public permissions!: CabinetMemberPermissions;
  public createdAt!: Date;
  public updatedAt!: Date;

  // Associations
  public cabinet?: Cabinet;
  public user?: User;
  public memberPermissions?: CabinetMemberPermission;
}

CabinetMember.init(
  {
    cabinetId: {
      type: DataTypes.UUID,
      primaryKey: true,
      references: {
        model: 'cabinets',
        key: 'id',
      },
      onDelete: 'CASCADE',
      field: 'cabinet_id',
    },
    userId: {
      type: DataTypes.UUID,
      primaryKey: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
      field: 'user_id',
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'member',
    },
    permissions: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {
        canRead: true,
        canWrite: false,
        canDelete: false,
        canShare: false,
      },
    },
  },
  {
    sequelize,
    tableName: 'cabinet_members',
    modelName: 'CabinetMember',
    underscored: true,
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