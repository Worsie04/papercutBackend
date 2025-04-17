// src/models/letterComment.model.ts
import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../infrastructure/database/sequelize';
import { Letter } from './letter.model'; // Import Letter model
import { User } from './user.model'; // Import User model

// Define allowed comment types
export type LetterCommentType = 'comment' | 'rejection' | 'approval' | 'system' | 'update';

interface LetterCommentAttributes {
  id: string;
  letterId: string; // Foreign key to Letter
  userId: string;   // Foreign key to User (the commenter)
  message: string;
  type: LetterCommentType;
  createdAt?: Date;
  updatedAt?: Date;
  // Add deletedAt if using paranoid: true
}

// Make id, createdAt, updatedAt optional on creation
export interface LetterCommentCreationAttributes extends Optional<LetterCommentAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class LetterComment extends Model<LetterCommentAttributes, LetterCommentCreationAttributes> implements LetterCommentAttributes {
  public id!: string;
  public letterId!: string;
  public userId!: string;
  public message!: string;
  public type!: LetterCommentType;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations can be defined here
  public readonly letter?: Letter;
  public readonly user?: User; // The user who made the comment
}

LetterComment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    letterId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'letter_id',
      references: {
        model: 'letters', // Ensure this matches your letters table name
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE', // Delete comments if the letter is deleted
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false, // Or true for system messages? Decide based on needs.
      field: 'user_id',
      references: {
        model: 'users', // Ensure this matches your users table name
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE', // Or SET NULL if you want to keep comments from deleted users
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('comment', 'rejection', 'approval', 'system', 'update'),
      allowNull: false,
      defaultValue: 'comment',
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at'
    },
    updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'updated_at'
    }
  },
  {
    sequelize,
    modelName: 'LetterComment',
    tableName: 'letter_comments', // Choose your table name
    timestamps: true, // Enable createdAt and updatedAt
    // paranoid: true, // Uncomment if you want soft deletes (adds deletedAt)
    underscored: true,
  }
);

// --- Define Associations ---
// A comment belongs to one Letter
LetterComment.belongsTo(Letter, { foreignKey: 'letterId', as: 'letter' });
Letter.hasMany(LetterComment, { foreignKey: 'letterId', as: 'comments' });

// A comment belongs to one User (the author)
LetterComment.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(LetterComment, { foreignKey: 'userId', as: 'letterComments' });

export default LetterComment;