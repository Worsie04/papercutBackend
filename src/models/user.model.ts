import { Model, DataTypes, Optional, Association } from 'sequelize';
import { sequelize } from '../infrastructure/database/sequelize';
import bcrypt from 'bcryptjs';
import { Role } from './role.model';

interface UserAttributes {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  isActive: boolean;
  emailVerifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  avatar?: string;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'isActive' | 'createdAt' | 'updatedAt' | 'avatar'> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: string;
  public email!: string;
  public password!: string;
  public firstName!: string;
  public lastName!: string;
  public phone?: string;
  public isActive!: boolean;
  public emailVerifiedAt?: Date;
  public createdAt!: Date;
  public updatedAt!: Date;
  public avatar?: string;

  // Association methods
  public readonly roles?: Role[];
  public addRole!: (role: Role, options?: any) => Promise<void>;
  public setRoles!: (roles: Role[], options?: any) => Promise<void>;
  public removeRole!: (role: Role, options?: any) => Promise<void>;
  public getRoles!: () => Promise<Role[]>;

  // Declare associations
  public static associations: {
    roles: Association<User, Role>;
  };
  lastLoginAt: Date | null = null;

  // Helper method to check if password matches
  public async comparePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    emailVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    avatar: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    hooks: {
      beforeCreate: async (user: User) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user: User) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
    },
  }
);

export { User, UserAttributes, UserCreationAttributes }; 