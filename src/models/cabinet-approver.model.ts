import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../infrastructure/database/sequelize';
import { User } from './user.model';
import { Cabinet } from './cabinet.model';

export class CabinetApprover extends Model {
  public id!: string;
  public userId!: string;
  public cabinetId!: string;
  public order!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public deletedAt?: Date;

  // Associations
  public user?: User;
  public cabinet?: Cabinet;
}

CabinetApprover.init(
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
    order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
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
    tableName: 'cabinet_approvers',
    paranoid: true,
    timestamps: true,
  }
);

// Set up associations
CabinetApprover.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

CabinetApprover.belongsTo(Cabinet, {
  foreignKey: 'cabinetId',
  as: 'cabinet',
});

export default CabinetApprover; 