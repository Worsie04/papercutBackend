import { Model, DataTypes, Optional, Association } from 'sequelize';
import { sequelize } from '../infrastructure/database/sequelize';
import bcrypt from 'bcryptjs';
import { Role } from './role.model';
import { Cabinet } from './cabinet.model';
import { CabinetMember } from './cabinet-member.model';

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
  twoFactorSecret?: string | null;
  twoFactorEnabled: boolean;
  magicLinkToken?: string;
  magicLinkTokenExpiresAt?: Date;
  position?: string;
  company?: string; // Added field
  timeZone?: string; // Added field
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'isActive' | 'createdAt' | 'updatedAt' | 'avatar' | 'twoFactorSecret' | 'twoFactorEnabled' | 'magicLinkToken' | 'magicLinkTokenExpiresAt' | 'position' | 'company' | 'timeZone'> {}

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
  public twoFactorSecret?: string | null;
  public twoFactorEnabled!: boolean;
  public magicLinkToken?: string;
  public magicLinkTokenExpiresAt?: Date;
  public position?: string;
  public company?: string; // Added field
  public timeZone?: string; // Added field

  public readonly roles?: Role[];
  public addRole!: (role: Role, options?: any) => Promise<void>;
  public setRoles!: (roles: Role[], options?: any) => Promise<void>;
  public removeRole!: (role: Role, options?: any) => Promise<void>;
  public getRoles!: () => Promise<Role[]>;

  public readonly createdCabinets?: Cabinet[];
  public readonly memberCabinets?: Cabinet[];
  public readonly approverCabinets?: Cabinet[];

  public static associations: {
    roles: Association<User, Role>;
    createdCabinets: Association<User, Cabinet>;
    memberCabinets: Association<User, Cabinet>;
    approverCabinets: Association<User, Cabinet>;
  };
  lastLoginAt: Date | null = null;

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
      allowNull: true,
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
    twoFactorSecret: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    twoFactorEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    magicLinkToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    magicLinkTokenExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    position: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    company: { // Added definition
      type: DataTypes.STRING,
      allowNull: true,
    },
    timeZone: { // Added definition
      type: DataTypes.STRING,
      allowNull: true,
      field: 'time_zone', // Explicitly map to snake_case column
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    underscored: true, // This helps map timeZone to time_zone automatically if field isn't specified
    hooks: {
      beforeCreate: async (user: User) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user: User) => {
        // Ensure the password field exists and has changed before hashing
        if (user.password && user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
    },
  }
);

export { User, UserAttributes, UserCreationAttributes };