"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../infrastructure/database/sequelize"); // Sequelize instance yolunu düzəldin
const template_model_1 = __importDefault(require("./template.model")); // Əsas Template modelini import edin
const user_model_1 = require("./user.model"); // User modelini import edin
class TemplateReviewer extends sequelize_1.Model {
}
TemplateReviewer.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    templateId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        field: 'template_id', // Cədvəldəki sütun adı (snake_case)
        references: {
            model: template_model_1.default,
            key: 'id',
        },
    },
    userId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        field: 'user_id', // Cədvəldəki sütun adı (snake_case)
        references: {
            model: user_model_1.User, // 'users' cədvəli ilə əlaqəli model
            key: 'id',
        },
    },
    createdAt: {
        type: sequelize_1.DataTypes.DATE,
        field: 'created_at',
        allowNull: false,
    },
    updatedAt: {
        type: sequelize_1.DataTypes.DATE,
        field: 'updated_at',
        allowNull: false,
    },
}, {
    tableName: 'template_reviewers',
    sequelize: sequelize_2.sequelize,
    timestamps: true,
    underscored: true,
});
TemplateReviewer.belongsTo(template_model_1.default, { foreignKey: 'templateId', as: 'template' });
template_model_1.default.hasMany(TemplateReviewer, { foreignKey: 'templateId', as: 'reviewers' });
TemplateReviewer.belongsTo(user_model_1.User, { foreignKey: 'userId', as: 'reviewer' });
user_model_1.User.hasMany(TemplateReviewer, { foreignKey: 'userId', as: 'reviewAssignments' });
exports.default = TemplateReviewer;
