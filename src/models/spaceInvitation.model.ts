import { Model, DataTypes, Optional, Op } from 'sequelize';
import { sequelize } from '../infrastructure/database/sequelize';
import { Space } from './space.model';
import { User } from './user.model';

export interface SpaceInvitationAttributes {
  id: string;
  spaceId: string;
  email: string;
  role: string;
  inviterId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  message?: string;
  expiresAt?: Date;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// These are all the attributes needed during creation
export interface SpaceInvitationCreationAttributes extends Optional<SpaceInvitationAttributes, 
  'id' | 'createdAt' | 'updatedAt' | 'expiresAt' | 'acceptedAt'> {}

export class SpaceInvitation extends Model<SpaceInvitationAttributes, SpaceInvitationCreationAttributes> 
  implements SpaceInvitationAttributes {
  public id!: string;
  public spaceId!: string;
  public email!: string;
  public role!: string;
  public inviterId!: string;
  public status!: 'pending' | 'accepted' | 'rejected' | 'expired';
  public message?: string;
  public expiresAt?: Date;
  public acceptedAt?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

SpaceInvitation.init(
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
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['member', 'co-owner', 'readonly']],
      },
    },
    inviterId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    status: {
      type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'expired'),
      allowNull: false,
      defaultValue: 'pending',
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from creation
    },
    acceptedAt: {
      type: DataTypes.DATE,
      allowNull: true,
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
  },
  {
    sequelize,
    tableName: 'space_invitations',
    modelName: 'SpaceInvitation',
  }
);

// Define associations
SpaceInvitation.belongsTo(Space, {
  foreignKey: 'spaceId',
  as: 'space',
});

SpaceInvitation.belongsTo(User, {
  foreignKey: 'inviterId',
  as: 'inviter',
});

// Add hooks to automatically expire invitations
SpaceInvitation.beforeFind((options: any) => {
  // Update expired invitations
  const currentDate = new Date();
  SpaceInvitation.update(
    { status: 'expired' },
    {
      where: {
        status: 'pending',
        expiresAt: {
          [Op.lt]: currentDate,
        },
      },
    }
  );
});

export default SpaceInvitation; 