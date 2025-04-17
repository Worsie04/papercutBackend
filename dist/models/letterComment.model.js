"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LetterComment = void 0;
// src/models/letterComment.model.ts
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../infrastructure/database/sequelize");
const letter_model_1 = require("./letter.model"); // Import Letter model
const user_model_1 = require("./user.model"); // Import User model
class LetterComment extends sequelize_1.Model {
}
exports.LetterComment = LetterComment;
LetterComment.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    letterId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        field: 'letter_id',
        references: {
            model: 'letters', // Ensure this matches your letters table name
            key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE', // Delete comments if the letter is deleted
    },
    userId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false, // Or true for system messages? Decide based on needs.
        field: 'user_id',
        references: {
            model: 'users', // Ensure this matches your users table name
            key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE', // Or SET NULL if you want to keep comments from deleted users
    },
    message: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
    },
    type: {
        type: sequelize_1.DataTypes.ENUM('comment', 'rejection', 'approval', 'system', 'update'),
        allowNull: false,
        defaultValue: 'comment',
    },
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
    sequelize: sequelize_2.sequelize,
    modelName: 'LetterComment',
    tableName: 'letter_comments', // Choose your table name
    timestamps: true, // Enable createdAt and updatedAt
    // paranoid: true, // Uncomment if you want soft deletes (adds deletedAt)
    underscored: true,
});
// --- Define Associations ---
// A comment belongs to one Letter
LetterComment.belongsTo(letter_model_1.Letter, { foreignKey: 'letterId', as: 'letter' });
letter_model_1.Letter.hasMany(LetterComment, { foreignKey: 'letterId', as: 'comments' });
// A comment belongs to one User (the author)
LetterComment.belongsTo(user_model_1.User, { foreignKey: 'userId', as: 'user' });
user_model_1.User.hasMany(LetterComment, { foreignKey: 'userId', as: 'letterComments' });
exports.default = LetterComment;
