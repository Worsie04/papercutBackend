import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../infrastructure/database/sequelize';
import { Space } from './space.model';
import { User } from './user.model';

export class SpaceCommentReject extends Model {
  public id!: string;
  public spaceId!: string;
  public userId!: string;
  public message!: string;
  public type!: 'comment' | 'rejection' | 'approval' | 'update' | 'system';
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt?: Date;
}

SpaceCommentReject.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
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
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('comment', 'rejection', 'approval', 'update', 'system'),
      allowNull: false,
      defaultValue: 'comment',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at',
    },
  },
  {
    sequelize,
    modelName: 'SpaceCommentReject',
    tableName: 'space_comments_rejects',
    timestamps: true,
    paranoid: true,
    underscored: true,
  }
);

// Define associations
SpaceCommentReject.belongsTo(Space, {
  foreignKey: 'spaceId',
  as: 'space',
});

SpaceCommentReject.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

// Add reverse associations to Space model
Space.hasMany(SpaceCommentReject, {
  foreignKey: 'spaceId',
  as: 'comments',
});

// Add specific comment type associations
Space.hasMany(SpaceCommentReject, {
  foreignKey: 'spaceId',
  as: 'rejectionComments',
  scope: {
    type: 'rejection',
  },
});

Space.hasMany(SpaceCommentReject, {
  foreignKey: 'spaceId',
  as: 'approvalComments',
  scope: {
    type: 'approval',
  },
});

// Add user association
User.hasMany(SpaceCommentReject, {
  foreignKey: 'userId',
  as: 'spaceComments',
}); 