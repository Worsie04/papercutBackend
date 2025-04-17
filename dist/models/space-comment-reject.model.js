"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpaceCommentReject = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../infrastructure/database/sequelize");
class SpaceCommentReject extends sequelize_1.Model {
}
exports.SpaceCommentReject = SpaceCommentReject;
SpaceCommentReject.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    spaceId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        field: 'space_id',
        references: {
            model: 'spaces',
            key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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
    message: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
    },
    type: {
        type: sequelize_1.DataTypes.ENUM('comment', 'rejection', 'approval', 'update', 'system'),
        allowNull: false,
        defaultValue: 'comment',
    },
    createdAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
        field: 'created_at',
    },
    updatedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
        field: 'updated_at',
    },
    deletedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        field: 'deleted_at',
    },
}, {
    sequelize: sequelize_2.sequelize,
    modelName: 'SpaceCommentReject',
    tableName: 'space_comments_rejects',
    timestamps: true,
    paranoid: true,
    underscored: true,
});
