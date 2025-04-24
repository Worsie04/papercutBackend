"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LetterActionLog = exports.LetterActionType = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../infrastructure/database/sequelize"); // Adjust import path
var LetterActionType;
(function (LetterActionType) {
    LetterActionType["SUBMIT"] = "submit";
    LetterActionType["APPROVE_REVIEW"] = "approve_review";
    LetterActionType["REJECT_REVIEW"] = "reject_review";
    LetterActionType["REASSIGN_REVIEW"] = "reassign_review";
    LetterActionType["FINAL_APPROVE"] = "final_approve";
    LetterActionType["FINAL_REJECT"] = "final_reject";
    LetterActionType["RESUBMIT"] = "resubmit";
    LetterActionType["COMMENT"] = "comment";
    LetterActionType["UPLOAD_REVISION"] = "upload_revision";
})(LetterActionType || (exports.LetterActionType = LetterActionType = {}));
class LetterActionLog extends sequelize_1.Model {
    static associate(models) {
        LetterActionLog.belongsTo(models.Letter, {
            foreignKey: 'letterId',
            as: 'letter'
        });
        LetterActionLog.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'user'
        });
    }
}
exports.LetterActionLog = LetterActionLog;
LetterActionLog.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
    },
    letterId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        field: 'letter_id',
        references: {
            model: 'letters',
            key: 'id'
        }
    },
    userId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        field: 'user_id',
        references: {
            model: 'users',
            key: 'id'
        }
    },
    actionType: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(LetterActionType)),
        allowNull: false,
        field: 'action_type'
    },
    comment: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true
    },
    details: {
        type: sequelize_1.DataTypes.JSONB,
        allowNull: true
    },
    createdAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
        field: 'created_at'
    }
}, {
    sequelize: sequelize_2.sequelize,
    tableName: 'letter_action_logs',
    timestamps: true,
    updatedAt: false, // No updatedAt needed for logs typically
    underscored: true,
    indexes: [
        {
            fields: ['letter_id']
        },
        {
            fields: ['user_id']
        },
        {
            fields: ['action_type']
        }
    ]
});
