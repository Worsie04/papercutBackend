"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../infrastructure/database/sequelize");
class ChatMessage extends sequelize_1.Model {
}
ChatMessage.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    recordId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        field: 'record_id',
    },
    userId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        field: 'user_id',
    },
    message: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
    },
    mentions: {
        type: sequelize_1.DataTypes.ARRAY(sequelize_1.DataTypes.UUID),
        defaultValue: [],
    },
    createdAt: {
        type: sequelize_1.DataTypes.DATE,
        field: 'created_at',
    },
    updatedAt: {
        type: sequelize_1.DataTypes.DATE,
        field: 'updated_at',
    },
}, {
    sequelize: sequelize_2.sequelize,
    modelName: 'ChatMessage',
    tableName: 'chat_messages',
    timestamps: true,
    underscored: true,
});
exports.default = ChatMessage;
