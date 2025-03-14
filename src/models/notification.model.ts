import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../infrastructure/database/sequelize';
import { BaseModel } from './base.model';
import { User } from './user.model';

interface NotificationAttributes {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'space_approval' | 'space_rejection' | 'space_reassignment' | 'space_creation' | 'space_deletion';
  read: boolean;
  entityType?: string;
  entityId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type NotificationCreationAttributes = Optional<NotificationAttributes, 'id' | 'read' | 'createdAt' | 'updatedAt'>;

export class Notification extends BaseModel implements NotificationAttributes {
  public id!: string;
  public userId!: string;
  public title!: string;
  public message!: string;
  public type!: 'space_approval' | 'space_rejection' | 'space_reassignment' | 'space_creation' | 'space_deletion';
  public read!: boolean;
  public entityType?: string;
  public entityId?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations
  public readonly user?: User;
}

Notification.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
      field: 'user_id',
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('space_approval', 'space_rejection', 'space_reassignment', 'space_creation', 'space_deletion'),
      allowNull: false,
    },
    read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    entityType: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'entity_type',
    },
    entityId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'entity_id',
    },
  },
  {
    sequelize,
    tableName: 'notifications',
    modelName: 'Notification',
    underscored: true,
  }
);

// Define relationships
Notification.belongsTo(User, { as: 'user', foreignKey: 'userId' });