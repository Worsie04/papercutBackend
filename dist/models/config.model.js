"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = exports.ConfigType = void 0;
const sequelize_1 = require("sequelize");
const base_model_1 = require("./base.model");
const sequelize_2 = require("../infrastructure/database/sequelize");
var ConfigType;
(function (ConfigType) {
    ConfigType["GLOBAL"] = "global";
    ConfigType["SPACE"] = "space";
    ConfigType["CABINET"] = "cabinet";
    ConfigType["USER"] = "user";
})(ConfigType || (exports.ConfigType = ConfigType = {}));
class Config extends base_model_1.BaseModel {
    // Helper methods
    async updateValue(value, userId) {
        if (this.validationRules) {
            // TODO: Implement JSON Schema validation
            // throw new Error if validation fails
        }
        this.value = value;
        this.lastModifiedBy = userId;
        await this.save();
    }
    getEffectiveValue() {
        var _a;
        return (_a = this.value) !== null && _a !== void 0 ? _a : this.defaultValue;
    }
    async validateValue(value) {
        if (!this.validationRules)
            return true;
        // TODO: Implement JSON Schema validation
        return true;
    }
}
exports.Config = Config;
Config.init(Object.assign(Object.assign({}, base_model_1.baseModelConfig), { name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    }, key: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    }, value: {
        type: sequelize_1.DataTypes.JSONB,
        allowNull: false,
    }, type: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(ConfigType)),
        allowNull: false,
        defaultValue: ConfigType.GLOBAL,
    }, scopeId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
        field: 'scope_id',
    }, description: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    }, validationRules: {
        type: sequelize_1.DataTypes.JSONB,
        allowNull: true,
        field: 'validation_rules',
    }, isSystem: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_system',
    }, isRequired: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_required',
    }, isVisible: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_visible',
    }, uiSchema: {
        type: sequelize_1.DataTypes.JSONB,
        allowNull: true,
        field: 'ui_schema',
    }, defaultValue: {
        type: sequelize_1.DataTypes.JSONB,
        allowNull: true,
        field: 'default_value',
    }, metadata: {
        type: sequelize_1.DataTypes.JSONB,
        allowNull: true,
    }, lastModifiedBy: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
        field: 'last_modified_by',
    } }), {
    sequelize: sequelize_2.sequelize,
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
});
