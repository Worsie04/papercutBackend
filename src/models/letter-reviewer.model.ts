import { DataTypes, Model, Optional, Sequelize, BelongsToGetAssociationMixin } from 'sequelize';
import { sequelize } from '../infrastructure/database/sequelize'; // Adjust import path
import { Letter } from './letter.model'; // Adjust import path
import { User } from './user.model'; // Adjust import path

export enum LetterReviewerStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SKIPPED = 'skipped',
  REASSIGNED = 'reassigned'
}

export interface LetterReviewerAttributes {
  id: string;
  letterId: string;
  userId: string;
  sequenceOrder: number;
  status: LetterReviewerStatus;
  actedAt?: Date | null;
  reassignedFromUserId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LetterReviewerCreationAttributes extends Optional<LetterReviewerAttributes, 'id' | 'createdAt' | 'updatedAt' | 'actedAt' | 'reassignedFromUserId'> {}

export class LetterReviewer extends Model<LetterReviewerAttributes, LetterReviewerCreationAttributes> implements LetterReviewerAttributes {
  public id!: string;
  public letterId!: string;
  public userId!: string;
  public sequenceOrder!: number;
  public status!: LetterReviewerStatus;
  public actedAt?: Date | null;
  public reassignedFromUserId?: string | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public getLetter!: BelongsToGetAssociationMixin<Letter>;
  public getUser!: BelongsToGetAssociationMixin<User>;
  public getReassignedFromUser!: BelongsToGetAssociationMixin<User>;

  public readonly letter?: Letter;
  public readonly user?: User;
  public readonly reassignedFromUser?: User;


  public static associate(models: any) {
    LetterReviewer.belongsTo(models.Letter, {
      foreignKey: 'letterId',
      as: 'letter'
    });
    LetterReviewer.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    LetterReviewer.belongsTo(models.User, {
        foreignKey: 'reassignedFromUserId',
        as: 'reassignedFromUser',
        constraints: false // Avoids FK constraint error if reassignedFromUserId is null
      });
  }
}

LetterReviewer.init({
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
  sequenceOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'sequence_order'
  },
  status: {
    type: DataTypes.ENUM(...Object.values(LetterReviewerStatus)),
    allowNull: false,
    defaultValue: LetterReviewerStatus.PENDING
  },
  actedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'acted_at'
  },
  reassignedFromUserId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'reassigned_from_user_id',
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'SET NULL'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'updated_at'
  }
}, {
  sequelize,
  tableName: 'letter_reviewers',
  timestamps: true,
  underscored: true,
  indexes: [
      {
          fields: ['letter_id', 'sequence_order']
      },
      {
          fields: ['letter_id']
      },
      {
          fields: ['user_id']
      }
  ]
});