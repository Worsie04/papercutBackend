import { DataTypes } from 'sequelize';
import { BaseModel, baseModelConfig } from './base.model';
import { sequelize } from '../infrastructure/database/sequelize';
import bcrypt from 'bcryptjs';

export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
}

export class Admin extends BaseModel {
  public email!: string;
  public password!: string;
  public firstName!: string;
  public lastName!: string;
  public phone?: string;
  public role!: AdminRole;
  public permissions!: string[];
  public isActive!: boolean;
  public lastLoginAt?: Date;
  public emailVerifiedAt?: Date;
  public avatar?: string;

  // Helper methods
  public async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }

  public getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  public hasPermission(permission: string): boolean {
    return this.permissions.includes(permission);
  }

  public toJSON(): any {
    const values = { ...this.get() };
    delete values.password;
    return values;
  }
}

Admin.init(
  {
    ...baseModelConfig,
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
      field: 'first_name',
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'last_name',
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    role: {
      type: DataTypes.ENUM(...Object.values(AdminRole)),
      allowNull: false,
      defaultValue: AdminRole.ADMIN,
    },
    permissions: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_login_at',
    },
    emailVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'email_verified_at',
    },
    avatar: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Admin',
    tableName: 'admins',
    paranoid: true,
    hooks: {
      beforeSave: async (admin: Admin) => {
        if (admin.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          admin.password = await bcrypt.hash(admin.password, salt);
        }
      },
    },
  }
); 