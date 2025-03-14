import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../infrastructure/database/sequelize';
import { User } from './user.model';
import { Space } from './space.model';

interface SpaceReassignmentAttributes {
  id: string;
  spaceId: string;
  fromUserId: string;
  toUserId: string;
  message?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SpaceReassignmentCreationAttributes
  extends Optional<SpaceReassignmentAttributes, 'id' | 'createdAt' | 'updatedAt' | 'message'> {}

export class SpaceReassignment extends Model<
  SpaceReassignmentAttributes,
  SpaceReassignmentCreationAttributes
> {
  declare id: string;
  declare spaceId: string;
  declare fromUserId: string;
  declare toUserId: string;
  declare message?: string;
  declare createdAt: Date;
  declare updatedAt: Date;

  // Add these for TypeScript type safety
  declare fromUser?: User;
  declare toUser?: User;
  declare space?: Space;
}

SpaceReassignment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    spaceId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'spaces',
        key: 'id',
      },
      field: 'space_id',
    },
    fromUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      field: 'from_user_id',
    },
    toUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      field: 'to_user_id',
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'space_reassignments',
    modelName: 'SpaceReassignment',
    underscored: true,
    timestamps: true,
  }
);

// Set up associations directly
SpaceReassignment.belongsTo(Space, { foreignKey: 'spaceId', as: 'space' });
SpaceReassignment.belongsTo(User, { foreignKey: 'fromUserId', as: 'fromUser' });
SpaceReassignment.belongsTo(User, { foreignKey: 'toUserId', as: 'toUser' });

// Keep this function for backward compatibility
export const setupSpaceReassignmentAssociations = () => {
  // Associations are now set up directly when this module is imported
  console.log('SpaceReassignment associations already set up');
};