// user-placeholder.model.ts
import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../infrastructure/database/sequelize';
import { User } from './user.model';

export class UserPlaceholder extends Model {
  public id!: string;
  public userId!: string;
  public name!: string;
  public orgName!: string;
  public type!: string;
  public initialValue?: string | null; // Renamed from defaultValue
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public deletedAt?: Date | null;

  // Virtual field for placeholder (computed, not stored)
  public get placeholder(): string {
    return `#${this.name.replace(/\s+/g, '')}#`;
  }

  public user?: User;
}

UserPlaceholder.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
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
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    orgName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    initialValue: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'default_value', // Maps to existing column
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
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at',
    },
  },
  {
    sequelize,
    tableName: 'user_placeholders',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'name'],
        where: { deleted_at: null },
      },
    ],
  }
);

UserPlaceholder.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

export default UserPlaceholder;