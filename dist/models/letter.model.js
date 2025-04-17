"use strict";
// src/models/letter.model.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Letter = exports.LetterStatus = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../infrastructure/database/sequelize"); // Adjust path if needed
const user_model_1 = require("./user.model"); // Import User model
const template_model_1 = __importDefault(require("./template.model")); // Import Template model
var LetterStatus;
(function (LetterStatus) {
    LetterStatus["DRAFT"] = "draft";
    LetterStatus["PENDING_REVIEW"] = "pending_review";
    LetterStatus["REVIEW_APPROVED"] = "review_approved";
    LetterStatus["REVIEW_REJECTED"] = "review_rejected";
    LetterStatus["PENDING_APPROVAL"] = "pending_approval";
    LetterStatus["APPROVED"] = "approved";
    LetterStatus["REJECTED"] = "rejected";
})(LetterStatus || (exports.LetterStatus = LetterStatus = {}));
class Letter extends sequelize_1.Model {
}
exports.Letter = Letter;
Letter.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    templateId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true, // Allow null for PDF-based letters
        field: 'template_id',
        references: { model: 'templates', key: 'id' },
        onDelete: 'SET NULL', // Important: Define behavior if template is deleted
        onUpdate: 'CASCADE',
    },
    userId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        field: 'user_id',
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE', // Or restrict if needed
        onUpdate: 'CASCADE',
    },
    formData: {
        type: sequelize_1.DataTypes.JSONB,
        allowNull: true, // Allow null for PDF-based letters
        field: 'form_data',
    },
    logoUrl: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        field: 'logo_url',
    },
    signatureUrl: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        field: 'signature_url',
    },
    stampUrl: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        field: 'stamp_url',
    },
    // --- NEW Field Definitions ---
    signedPdfUrl: {
        type: sequelize_1.DataTypes.STRING, // Store R2 key or full URL
        allowNull: true,
        field: 'signed_pdf_url',
    },
    originalPdfFileId: {
        type: sequelize_1.DataTypes.UUID, // Match the type of your File model's ID
        allowNull: true,
        field: 'original_pdf_file_id',
    },
    status: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(LetterStatus)),
        allowNull: false,
        defaultValue: LetterStatus.PENDING_REVIEW, // Set default status
        field: 'status',
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
    tableName: 'letters',
    sequelize: sequelize_2.sequelize,
    timestamps: true,
    underscored: true, // Keep using snake_case for database columns
});
// --- Define Associations ---
// Ensure associations are defined after model initialization
Letter.belongsTo(user_model_1.User, { foreignKey: 'userId', as: 'user' });
Letter.belongsTo(template_model_1.default, { foreignKey: 'templateId', as: 'template' });
