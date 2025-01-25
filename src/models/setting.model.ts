import { DataTypes } from 'sequelize';
import { BaseModel, baseModelConfig } from './base.model';
import { sequelize } from '../infrastructure/database/sequelize';

export enum SettingType {
  SYSTEM = 'system',
  SECURITY = 'security',
  EMAIL = 'email',
  STORAGE = 'storage',
  NOTIFICATION = 'notification',
  INTEGRATION = 'integration',
}

export class Setting extends BaseModel {
  public key!: string;
  public value!: any;
  public type!: SettingType;
  public description?: string;
  public isPublic!: boolean;
  public isEncrypted!: boolean;
  public metadata?: any;
  public lastModifiedBy!: string;

  // Helper methods
  public async updateValue(value: any, userId: string): Promise<void> {
    this.value = value;
    this.lastModifiedBy = userId;
    await this.save();
  }

  public getValue(): any {
    // TODO: Implement decryption if isEncrypted is true
    return this.value;
  }
}

Setting.init(
  {
    ...baseModelConfig,
    key: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    value: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM(...Object.values(SettingType)),
      allowNull: false,
      defaultValue: SettingType.SYSTEM,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_public',
    },
    isEncrypted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_encrypted',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    lastModifiedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      field: 'last_modified_by',
    },
  },
  {
    sequelize,
    modelName: 'Setting',
    tableName: 'settings',
    paranoid: true,
  }
); 