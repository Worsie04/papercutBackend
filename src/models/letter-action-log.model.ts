import { DataTypes, Model, Optional, Sequelize, BelongsToGetAssociationMixin } from 'sequelize';
import { sequelize } from '../infrastructure/database/sequelize'; // Adjust import path
import { Letter } from './letter.model'; // Adjust import path
import { User } from './user.model'; // Adjust import path

export enum LetterActionType {
  SUBMIT = 'submit',
  APPROVE_REVIEW = 'approve_review',
  REJECT_REVIEW = 'reject_review',
  REASSIGN_REVIEW = 'reassign_review',
  FINAL_APPROVE = 'final_approve',
  FINAL_REJECT = 'final_reject',
  RESUBMIT = 'resubmit',
  COMMENT = 'comment',
  UPLOAD_REVISION = 'upload_revision',
  DELETE = 'delete',
  RESTORE = 'restore',
  PERMANENT_DELETE = 'permanent_delete'
}

export interface LetterActionLogAttributes {
  id: string;
  letterId: string;
  userId: string;
  actionType: LetterActionType;
  comment?: string | null;
  details?: object | null; // For JSONB data like { reassignedToUserId: '...' }
  createdAt?: Date;
}

export interface LetterActionLogCreationAttributes extends Optional<LetterActionLogAttributes, 'id' | 'createdAt' | 'comment' | 'details'> {}

export class LetterActionLog extends Model<LetterActionLogAttributes, LetterActionLogCreationAttributes> implements LetterActionLogAttributes {
  public id!: string;
  public letterId!: string;
  public userId!: string;
  public actionType!: LetterActionType;
  public comment?: string | null;
  public details?: object | null;

  public readonly createdAt!: Date;

  public getLetter!: BelongsToGetAssociationMixin<Letter>;
  public getUser!: BelongsToGetAssociationMixin<User>;

  public readonly letter?: Letter;
  public readonly user?: User;


  public static associate(models: any) {
    LetterActionLog.belongsTo(models.Letter, {
      foreignKey: 'letterId',
      as: 'letter'
    });
    LetterActionLog.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  }
}

LetterActionLog.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  letterId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'letter_id',
    references: {
      model: 'letters',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  actionType: {
    type: DataTypes.ENUM(...Object.values(LetterActionType)),
    allowNull: false,
    field: 'action_type'
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  details: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  }
}, {
  sequelize,
  tableName: 'letter_action_logs',
  timestamps: true,
  updatedAt: false, // No updatedAt needed for logs typically
  underscored: true,
  indexes: [
      {
          fields: ['letter_id']
      },
      {
          fields: ['user_id']
      },
      {
           fields: ['action_type']
       }
  ]
});