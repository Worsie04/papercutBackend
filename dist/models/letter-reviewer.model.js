"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LetterReviewer = exports.LetterReviewerStatus = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../infrastructure/database/sequelize"); // Adjust import path
var LetterReviewerStatus;
(function (LetterReviewerStatus) {
    LetterReviewerStatus["PENDING"] = "pending";
    LetterReviewerStatus["APPROVED"] = "approved";
    LetterReviewerStatus["REJECTED"] = "rejected";
    LetterReviewerStatus["SKIPPED"] = "skipped";
    LetterReviewerStatus["REASSIGNED"] = "reassigned";
})(LetterReviewerStatus || (exports.LetterReviewerStatus = LetterReviewerStatus = {}));
class LetterReviewer extends sequelize_1.Model {
    static associate(models) {
        LetterReviewer.belongsTo(models.Letter, {
            foreignKey: 'letterId',
            as: 'letter'
        });
        LetterReviewer.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'user'
        });
        LetterReviewer.belongsTo(models.User, {
            foreignKey: 'reassignedFromUserId',
            as: 'reassignedFromUser',
            constraints: false // Avoids FK constraint error if reassignedFromUserId is null
        });
    }
}
exports.LetterReviewer = LetterReviewer;
LetterReviewer.init({
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
    sequenceOrder: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        field: 'sequence_order'
    },
    status: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(LetterReviewerStatus)),
        allowNull: false,
        defaultValue: LetterReviewerStatus.PENDING
    },
    actedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        field: 'acted_at'
    },
    reassignedFromUserId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
        field: 'reassigned_from_user_id',
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'SET NULL'
    },
    createdAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
        field: 'created_at'
    },
    updatedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
        field: 'updated_at'
    }
}, {
    sequelize: sequelize_2.sequelize,
    tableName: 'letter_reviewers',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            fields: ['letter_id', 'sequence_order']
        },
        {
            fields: ['letter_id']
        },
        {
            fields: ['user_id']
        }
    ]
});
