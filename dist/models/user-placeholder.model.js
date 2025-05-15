"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserPlaceholder = void 0;
// user-placeholder.model.ts
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../infrastructure/database/sequelize");
const user_model_1 = require("./user.model");
class UserPlaceholder extends sequelize_1.Model {
    // Virtual field for placeholder (computed, not stored)
    get placeholder() {
        return `#${this.name.replace(/\s+/g, '_')}#`;
    }
}
exports.UserPlaceholder = UserPlaceholder;
UserPlaceholder.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: sequelize_1.DataTypes.UUID,
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
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    type: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    initialValue: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
        field: 'default_value', // Maps to existing column
    },
    createdAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
    },
    updatedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        field: 'updated_at',
    },
    deletedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        field: 'deleted_at',
    },
}, {
    sequelize: sequelize_2.sequelize,
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
});
UserPlaceholder.belongsTo(user_model_1.User, {
    foreignKey: 'userId',
    as: 'user',
});
exports.default = UserPlaceholder;
