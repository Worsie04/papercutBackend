import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../infrastructure/database/sequelize';
import { BaseModel } from './base.model';
import { User } from './user.model';

const NotificationTypes = [
  // Existing Space types
  'space_approval', 'space_rejection', 'space_reassignment', 'space_creation', 'space_deletion',
  // Existing Cabinet types
  'cabinet_approval', 'cabinet_rejection', 'cabinet_reassignment', 'cabinet_creation', 'cabinet_deletion', 'cabinet_update', 'cabinet_resubmitted',
  // Existing Record types
  'record_approval', 'record_rejection', 'record_reassignment', 'record_creation', 'record_deletion', 'record_update', 'record_modification',
  // Existing Template types
  'template_share', 'template_update', 'template_delete',
  // --- NEW Letter Types ---
  'letter_review_request', // Sent to reviewers when a letter is submitted
  'letter_review_approved', // Sent to submitter when reviewers approve
  'letter_review_rejected', // Sent to submitter when reviewers reject
  'letter_final_approved',  // Sent to submitter on final approval
  'letter_final_rejected',
] as const;

type NotificationType = typeof NotificationTypes[number];

interface NotificationAttributes {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
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
  public type!: NotificationType;
  public read!: boolean;
  public entityType?: string;
  public entityId?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
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