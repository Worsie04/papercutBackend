import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../infrastructure/database/sequelize';
import { Cabinet } from './cabinet.model';
import { User } from './user.model';

export class CabinetNoteComment extends Model {
  public id!: string;
  public cabinetId!: string;
  public content!: string;
  public type!: 'note' | 'comment' | 'system';
  public action?: 'approve' | 'reject' | 'update' | 'reassign';
  public createdBy!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt?: Date;
}

CabinetNoteComment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    cabinetId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'cabinets',
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
    modelName: 'CabinetNoteComment',
    tableName: 'cabinets_notes_comments',
    paranoid: true,
    timestamps: true,
  }
);

// Assosiasiyaların təyin edilməsi
CabinetNoteComment.belongsTo(Cabinet, {
  foreignKey: 'cabinetId',
  as: 'cabinet',
});

CabinetNoteComment.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator',
});

// Cabinet modelinə reverse assosiasiyalar əlavə edirik
Cabinet.hasMany(CabinetNoteComment, {
  foreignKey: 'cabinetId',
  as: 'notesAndComments',
});

Cabinet.hasMany(CabinetNoteComment, {
  foreignKey: 'cabinetId',
  as: 'notes',
  scope: {
    type: 'note',
  },
});

Cabinet.hasMany(CabinetNoteComment, {
  foreignKey: 'cabinetId',
  as: 'comments',
  scope: {
    type: 'comment',
  },
});