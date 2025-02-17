import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../infrastructure/database/sequelize';
import { Record } from './record.model';
import { User } from './user.model';

export class RecordNoteComment extends Model {
  public id!: string;
  public recordId!: string;
  public content!: string;
  public type!: 'note' | 'comment' | 'system';
  public action?: 'approve' | 'reject' | 'update' | 'reassign';
  public createdBy!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt?: Date;
}

RecordNoteComment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    recordId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'records',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('note', 'comment', 'system'),
      allowNull: false,
      defaultValue: 'comment',
    },
    action: {
      type: DataTypes.ENUM('approve', 'reject', 'update', 'reassign'),
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'RecordNoteComment',
    tableName: 'records_notes_comments',
    paranoid: true,
    timestamps: true,
  }
);

// Define associations
RecordNoteComment.belongsTo(Record, {
  foreignKey: 'recordId',
  as: 'record',
});

RecordNoteComment.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator',
});

// Add reverse associations to Record model
Record.hasMany(RecordNoteComment, {
  foreignKey: 'recordId',
  as: 'notesAndComments',
});

Record.hasMany(RecordNoteComment, {
  foreignKey: 'recordId',
  as: 'notes',
  scope: {
    type: 'note',
  },
});

Record.hasMany(RecordNoteComment, {
  foreignKey: 'recordId',
  as: 'comments',
  scope: {
    type: 'comment',
  },
}); 