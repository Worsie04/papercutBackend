import { DataTypes } from 'sequelize';
import { BaseModel, baseModelConfig } from './base.model';
import { sequelize } from '../infrastructure/database/sequelize';

export class SpaceMember extends BaseModel {
  public spaceId!: string;
  public userId!: string;
  public role!: string;
  public permissions!: string[];
  public createdAt!: Date;
  public updatedAt!: Date;
}

SpaceMember.init(
  {
    ...baseModelConfig,
    spaceId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'space_id',
      references: {
        model: 'spaces',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'member',
    },
    permissions: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'SpaceMember',
    tableName: 'space_members',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['space_id', 'user_id'],
      },
    ],
  }
); 