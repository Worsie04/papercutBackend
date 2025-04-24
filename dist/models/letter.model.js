"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Letter = exports.LetterWorkflowStatus = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../infrastructure/database/sequelize"); // Adjust import path as needed
var LetterWorkflowStatus;
(function (LetterWorkflowStatus) {
    LetterWorkflowStatus["DRAFT"] = "draft";
    LetterWorkflowStatus["PENDING_REVIEW"] = "pending_review";
    LetterWorkflowStatus["PENDING_APPROVAL"] = "pending_approval";
    LetterWorkflowStatus["APPROVED"] = "approved";
    LetterWorkflowStatus["REJECTED"] = "rejected";
})(LetterWorkflowStatus || (exports.LetterWorkflowStatus = LetterWorkflowStatus = {}));
class Letter extends sequelize_1.Model {
    static associate(models) {
        Letter.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'user'
        });
        Letter.belongsTo(models.Template, {
            foreignKey: 'templateId',
            as: 'template',
            constraints: false // allowNull is defined in the attribute definition
        });
        Letter.belongsTo(models.User, {
            foreignKey: 'nextActionById',
            as: 'nextActionBy',
            constraints: false
        });
        Letter.hasMany(models.LetterReviewer, {
            foreignKey: 'letterId',
            as: 'letterReviewers'
        });
        Letter.hasMany(models.LetterActionLog, {
            foreignKey: 'letterId',
            as: 'letterActionLogs'
        });
        // Add association to File model if needed
        // Letter.belongsTo(models.File, { foreignKey: 'originalPdfFileId', as: 'originalFile' });
    }
}
exports.Letter = Letter;
Letter.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
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
    templateId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
        field: 'template_id',
        references: {
            model: 'templates',
            key: 'id'
        },
        onDelete: 'SET NULL'
    },
    originalPdfFileId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
        field: 'original_pdf_file_id',
        // Add FK reference if you have a 'files' table
        // references: { model: 'files', key: 'id' }
    },
    name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    formData: {
        type: sequelize_1.DataTypes.JSONB,
        allowNull: true,
        field: 'form_data'
    },
    logoUrl: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        field: 'logo_url'
    },
    signatureUrl: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        field: 'signature_url'
    },
    stampUrl: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        field: 'stamp_url'
    },
    signedPdfUrl: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        field: 'signed_pdf_url'
    },
    workflowStatus: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(LetterWorkflowStatus)),
        allowNull: false,
        defaultValue: LetterWorkflowStatus.DRAFT,
        field: 'workflow_status'
    },
    currentStepIndex: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        field: 'current_step_index'
    },
    nextActionById: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
        field: 'next_action_by_id',
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'SET NULL'
    },
    qrCodeUrl: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        field: 'qr_code_url'
    },
    publicLink: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        field: 'public_link'
    },
    finalSignedPdfUrl: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        field: 'final_signed_pdf_url'
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
    },
    status: {
        type: sequelize_1.DataTypes.STRING, // Kept for potential backward compatibility if needed
        allowNull: true
    },
}, {
    sequelize: sequelize_2.sequelize,
    tableName: 'letters',
    timestamps: true,
    underscored: true,
    paranoid: false // Set to true if you want soft deletes
});
