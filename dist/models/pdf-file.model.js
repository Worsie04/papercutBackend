"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PdfFile = void 0;
exports.initPdfFileAssociations = initPdfFileAssociations;
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../infrastructure/database/sequelize");
const record_model_1 = require("./record.model");
class PdfFile extends sequelize_1.Model {
}
exports.PdfFile = PdfFile;
PdfFile.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true
    },
    recordId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'records',
            key: 'id'
        },
        field: 'record_id' // Map to snake_case column name
    },
    originalFileName: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        field: 'original_file_name' // Map to snake_case column name
    },
    filePath: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        field: 'file_path' // Map to snake_case column name
    },
    fileSize: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        field: 'file_size' // Map to snake_case column name
    },
    fileHash: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        field: 'file_hash' // Map to snake_case column name
    },
    pageCount: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        field: 'page_count' // Map to snake_case column name
    },
    extractedText: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
        field: 'extracted_text' // Map to snake_case column name
    },
    extractedMetadata: {
        type: sequelize_1.DataTypes.JSONB,
        allowNull: true,
        field: 'extracted_metadata' // Map to snake_case column name
    }
}, {
    sequelize: sequelize_2.sequelize,
    tableName: 'pdf_files',
    timestamps: true,
    underscored: true // This tells Sequelize that column names are snake_case
});
// Define associations
function initPdfFileAssociations() {
    PdfFile.belongsTo(record_model_1.Record, { foreignKey: 'recordId', as: 'record' });
    record_model_1.Record.hasOne(PdfFile, { foreignKey: 'recordId', as: 'pdfFile' });
}
