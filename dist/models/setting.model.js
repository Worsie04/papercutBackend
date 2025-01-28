"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Setting = exports.SettingType = void 0;
const sequelize_1 = require("sequelize");
const base_model_1 = require("./base.model");
const sequelize_2 = require("../infrastructure/database/sequelize");
var SettingType;
(function (SettingType) {
    SettingType["SYSTEM"] = "system";
    SettingType["SECURITY"] = "security";
    SettingType["EMAIL"] = "email";
    SettingType["STORAGE"] = "storage";
    SettingType["NOTIFICATION"] = "notification";
    SettingType["INTEGRATION"] = "integration";
})(SettingType || (exports.SettingType = SettingType = {}));
class Setting extends base_model_1.BaseModel {
    // Helper methods
    async updateValue(value, userId) {
        this.value = value;
        this.lastModifiedBy = userId;
        await this.save();
    }
    getValue() {
        // TODO: Implement decryption if isEncrypted is true
        return this.value;
    }
}
exports.Setting = Setting;
Setting.init(Object.assign(Object.assign({}, base_model_1.baseModelConfig), { key: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        unique: true,
    }, value: {
        type: sequelize_1.DataTypes.JSONB,
        allowNull: false,
    }, type: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(SettingType)),
        allowNull: false,
        defaultValue: SettingType.SYSTEM,
    }, description: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    }, isPublic: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_public',
    }, isEncrypted: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_encrypted',
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
    modelName: 'Setting',
    tableName: 'settings',
    paranoid: true,
});
