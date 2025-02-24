"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecordNoteComment = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../infrastructure/database/sequelize");
const record_model_1 = require("./record.model");
const user_model_1 = require("./user.model");
class RecordNoteComment extends sequelize_1.Model {
}
exports.RecordNoteComment = RecordNoteComment;
RecordNoteComment.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
    },
    recordId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'records',
            key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    },
    content: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
    },
    type: {
        type: sequelize_1.DataTypes.ENUM('note', 'comment', 'system'),
        allowNull: false,
        defaultValue: 'comment',
    },
    action: {
        type: sequelize_1.DataTypes.ENUM('approve', 'reject', 'update', 'reassign'),
        allowNull: true,
    },
    createdBy: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
    },
    createdAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
    },
    updatedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
    },
    deletedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
}, {
    sequelize: sequelize_2.sequelize,
    modelName: 'RecordNoteComment',
    tableName: 'records_notes_comments',
    paranoid: true,
    timestamps: true,
});
// Define associations
RecordNoteComment.belongsTo(record_model_1.Record, {
    foreignKey: 'recordId',
    as: 'record',
});
RecordNoteComment.belongsTo(user_model_1.User, {
    foreignKey: 'createdBy',
    as: 'creator',
});
// Add reverse associations to Record model
record_model_1.Record.hasMany(RecordNoteComment, {
    foreignKey: 'recordId',
    as: 'notesAndComments',
});
record_model_1.Record.hasMany(RecordNoteComment, {
    foreignKey: 'recordId',
    as: 'notes',
    scope: {
        type: 'note',
    },
});
record_model_1.Record.hasMany(RecordNoteComment, {
    foreignKey: 'recordId',
    as: 'comments',
    scope: {
        type: 'comment',
    },
});
