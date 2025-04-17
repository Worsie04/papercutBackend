"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CabinetNoteComment = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../infrastructure/database/sequelize");
const cabinet_model_1 = require("./cabinet.model");
const user_model_1 = require("./user.model");
class CabinetNoteComment extends sequelize_1.Model {
}
exports.CabinetNoteComment = CabinetNoteComment;
CabinetNoteComment.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
    },
    cabinetId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'cabinets',
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
    modelName: 'CabinetNoteComment',
    tableName: 'cabinets_notes_comments',
    paranoid: true,
    timestamps: true,
});
// Assosiasiyaların təyin edilməsi
CabinetNoteComment.belongsTo(cabinet_model_1.Cabinet, {
    foreignKey: 'cabinetId',
    as: 'cabinet',
});
CabinetNoteComment.belongsTo(user_model_1.User, {
    foreignKey: 'createdBy',
    as: 'creator',
});
// Cabinet modelinə reverse assosiasiyalar əlavə edirik
cabinet_model_1.Cabinet.hasMany(CabinetNoteComment, {
    foreignKey: 'cabinetId',
    as: 'notesAndComments',
});
cabinet_model_1.Cabinet.hasMany(CabinetNoteComment, {
    foreignKey: 'cabinetId',
    as: 'notes',
    scope: {
        type: 'note',
    },
});
cabinet_model_1.Cabinet.hasMany(CabinetNoteComment, {
    foreignKey: 'cabinetId',
    as: 'comments',
    scope: {
        type: 'comment',
    },
});
