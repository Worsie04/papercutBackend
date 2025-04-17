"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../infrastructure/database/sequelize"); // Adjust path
class TemplateShare extends sequelize_1.Model {
}
TemplateShare.init({
    id: {
        type: sequelize_1.DataTypes.UUID, // Or DataTypes.INTEGER + autoIncrement: true
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    templateId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        field: 'template_id',
    },
    sharedByUserId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        field: 'shared_by_user_id',
    },
    sharedWithUserId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        field: 'shared_with_user_id',
    },
    sharedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
        field: 'shared_at',
    },
    // Sequelize automatically handles createdAt and updatedAt if timestamps: true
    createdAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        field: 'created_at'
    },
    updatedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        field: 'updated_at'
    }
}, {
    tableName: 'template_shares',
    sequelize: sequelize_2.sequelize,
    timestamps: true,
    underscored: true,
});
exports.default = TemplateShare;
