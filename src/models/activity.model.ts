import { Model, DataTypes } from 'sequelize';
import {sequelize} from '../infrastructure/database/sequelize';
import { User } from './user.model';

export enum ActivityType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  REASSIGN = 'REASSIGN',
  SUBMIT = 'SUBMIT',
  RESUBMIT = 'RESUBMIT',
  UPDATE_PERMISSIONS = 'UPDATE_PERMISSIONS'
}

export enum ResourceType {
  SPACE = 'SPACE',
  CABINET = 'CABINET',
  RECORD = 'RECORD',
  FILE = 'FILE'
}

export enum ActivityStatus {
  COMPLETED = 'completed',
  PENDING = 'pending',
  REJECTED = 'rejected',
  DEFAULT = 'default'
}

export class Activity extends Model {
  public id!: string;
  public userId!: string;
  public action!: ActivityType;
  public resourceType!: ResourceType;
  public resourceId!: string;
  public resourceName!: string;
  public details?: string;
  public status?: ActivityStatus;
  public timestamp!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Activity.init(
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
      field: 'user_id', // Map the camelCase property to snake_case column
    },
    action: {
      type: DataTypes.ENUM(...Object.values(ActivityType)),
      allowNull: false,
    },
    resourceType: {
      type: DataTypes.ENUM(...Object.values(ResourceType)),
      allowNull: false,
      field: 'resource_type', // Map the camelCase property to snake_case column
    },
    resourceId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'resource_id', // Map the camelCase property to snake_case column
    },
    resourceName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'resource_name', // Map the camelCase property to snake_case column
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(ActivityStatus)),
      allowNull: true,
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'activities',
    modelName: 'Activity',
    underscored: true, // This tells Sequelize that columns are snake_case
    timestamps: true, // This enables createdAt and updatedAt
    createdAt: 'created_at', // Map createdAt to created_at
    updatedAt: 'updated_at', // Map updatedAt to updated_at
  }
);

// Define associations
Activity.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

export default Activity;