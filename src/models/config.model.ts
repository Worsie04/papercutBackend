import { DataTypes } from 'sequelize';
import { BaseModel, baseModelConfig } from './base.model';
import { sequelize } from '../infrastructure/database/sequelize';

export enum ConfigType {
  GLOBAL = 'global',
  SPACE = 'space',
  CABINET = 'cabinet',
  USER = 'user',
}

export class Config extends BaseModel {
  public name!: string;
  public key!: string;
  public value!: any;
  public type!: ConfigType;
  public scopeId?: string;
  public description?: string;
  public validationRules?: any;
  public isSystem!: boolean;
  public isRequired!: boolean;
  public isVisible!: boolean;
  public uiSchema?: any;
  public defaultValue?: any;
  public metadata?: any;
  public lastModifiedBy!: string;

  // Helper methods
  public async updateValue(value: any, userId: string): Promise<void> {
    if (this.validationRules) {
      // TODO: Implement JSON Schema validation
      // throw new Error if validation fails
    }
    this.value = value;
    this.lastModifiedBy = userId;
    await this.save();
  }

  public getEffectiveValue(): any {
    return this.value ?? this.defaultValue;
  }

  public async validateValue(value: any): Promise<boolean> {
    if (!this.validationRules) return true;
    // TODO: Implement JSON Schema validation
    return true;
  }
}

Config.init(
  {
    ...baseModelConfig,
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    key: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    value: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM(...Object.values(ConfigType)),
      allowNull: false,
      defaultValue: ConfigType.GLOBAL,
    },
    scopeId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'scope_id',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    validationRules: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'validation_rules',
    },
    isSystem: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_system',
    },
    isRequired: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_required',
    },
    isVisible: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_visible',
    },
    uiSchema: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'ui_schema',
    },
    defaultValue: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'default_value',
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
    modelName: 'Config',
    tableName: 'configs',
    paranoid: true,
    indexes: [
      {
        unique: true,
        fields: ['key', 'type', 'scope_id'],
        name: 'unique_config_key_type_scope',
      },
    ],
  }
); 