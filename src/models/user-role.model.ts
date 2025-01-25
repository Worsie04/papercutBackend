import { DataTypes } from 'sequelize';
import { BaseModel, baseModelConfig } from './base.model';
import { sequelize } from '../infrastructure/database/sequelize';

export class UserRole extends BaseModel {
  public userId!: string;
  public roleId!: string;
}

UserRole.init(
  {
    ...baseModelConfig,
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    roleId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'roles',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
  },
  {
    sequelize,
    modelName: 'UserRole',
    tableName: 'user_roles',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['userId', 'roleId'],
      },
    ],
  }
); 