"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecordService = void 0;
const record_model_1 = require("../models/record.model");
const user_model_1 = require("../models/user.model");
const cabinet_model_1 = require("../models/cabinet.model");
const errorHandler_1 = require("../presentation/middlewares/errorHandler");
const sequelize_1 = require("sequelize");
const record_version_model_1 = require("../models/record-version.model");
const sequelize_2 = require("../infrastructure/database/sequelize");
const cabinet_member_model_1 = require("../models/cabinet-member.model");
const record_note_comment_model_1 = require("../models/record-note-comment.model");
const pdf_file_model_1 = require("../models/pdf-file.model");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const file_service_1 = __importDefault(require("./file.service"));
const activity_service_1 = require("./activity.service");
const activity_model_1 = require("../models/activity.model");
const notification_service_1 = require("./notification.service");
const recordOtherVersion_model_1 = __importDefault(require("../models/recordOtherVersion.model"));
const { PDFExtract } = require('pdf.js-extract');
const pdfExtract = new PDFExtract();
// For file operations
const writeFileAsync = (0, util_1.promisify)(fs_1.default.writeFile);
const readFileAsync = (0, util_1.promisify)(fs_1.default.readFile);
const UPLOAD_DIR = path_1.default.join(process.cwd(), 'uploads');
// Make sure the upload directory exists
if (!fs_1.default.existsSync(UPLOAD_DIR)) {
    fs_1.default.mkdirSync(UPLOAD_DIR, { recursive: true });
}
// Enhanced PDF extractor that analyzes content using pdf.js-extract
async function extractPdfContent(file) {
    try {
        // Save file temporarily for extraction
        const tempPath = path_1.default.join(UPLOAD_DIR, `temp_${Date.now()}.pdf`);
        await writeFileAsync(tempPath, file.buffer);
        // Extract data from PDF
        const extractOptions = {};
        const pdfData = await pdfExtract.extract(tempPath, extractOptions);
        // Clean up temp file
        fs_1.default.unlink(tempPath, (err) => {
            if (err)
                console.error('Error removing temp file:', err);
        });
        // Process the extracted data
        const pageCount = pdfData.pages.length;
        let extractedText = '';
        const extractedFields = [];
        // Extract text and look for key-value pairs
        for (const page of pdfData.pages) {
            // Sort content by y position to maintain reading order
            const sortedContent = [...page.content].sort((a, b) => a.y - b.y);
            // Join text by line
            let currentY = -1;
            let currentLine = '';
            for (const item of sortedContent) {
                if (Math.abs(item.y - currentY) > 1) {
                    // New line detected
                    if (currentLine) {
                        extractedText += currentLine + '\n';
                        // Try to extract key-value pairs
                        const colonMatch = currentLine.match(/([^:]+):\s*(.*)/);
                        if (colonMatch && colonMatch[1] && colonMatch[2]) {
                            const key = colonMatch[1].trim();
                            const value = colonMatch[2].trim();
                            // Skip empty values and very short keys
                            if (value && key.length > 1) {
                                extractedFields.push({
                                    name: key,
                                    value: value
                                });
                            }
                        }
                        // Reset current line
                        currentLine = '';
                    }
                    currentY = item.y;
                }
                // Add text to current line
                currentLine += item.str + ' ';
            }
            // Don't forget the last line
            if (currentLine) {
                extractedText += currentLine + '\n';
            }
        }
        // Analyze the extracted text for structure (tables, lists, etc.)
        const lines = extractedText.split('\n');
        const structuredExtraction = analyzeTextStructure(lines);
        // Combine basic extraction with structured analysis
        return {
            extractedText,
            extractedFields: [...extractedFields, ...structuredExtraction],
            pageCount
        };
    }
    catch (error) {
        console.error('Error extracting PDF content:', error);
        throw new errorHandler_1.AppError(500, 'Failed to process PDF file');
    }
}
// Helper function to analyze text structure for additional field extraction
function analyzeTextStructure(lines) {
    const extractedFields = [];
    // Detect tables, forms, address blocks, etc.
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line)
            continue;
        // Look for address blocks
        if (line.match(/bill to|ship to|address|customer|client/i) && i + 1 < lines.length) {
            let addressValue = '';
            let j = i + 1;
            while (j < lines.length && j < i + 5) {
                const addressLine = lines[j].trim();
                if (!addressLine || addressLine.includes(':'))
                    break;
                addressValue += addressLine + ' ';
                j++;
            }
            if (addressValue.trim()) {
                extractedFields.push({
                    name: line.replace(':', '').trim(),
                    value: addressValue.trim()
                });
            }
        }
        // Common invoice fields
        const commonFields = ['invoice', 'date', 'due date', 'subtotal', 'tax', 'total', 'amount', 'payment', 'po number'];
        for (const field of commonFields) {
            if (line.toLowerCase().includes(field)) {
                // Try to extract value from same line or next line
                let value = '';
                // Check if there's already a value after the field name
                if (line.includes(':')) {
                    const parts = line.split(':');
                    if (parts.length > 1 && parts[1].trim()) {
                        value = parts[1].trim();
                    }
                }
                // Look for numeric value on same line
                else if (/\d/.test(line)) {
                    const words = line.split(/\s+/);
                    const numericWords = words.filter(w => /\d/.test(w));
                    if (numericWords.length > 0) {
                        // If field is at beginning and there's a number after
                        if (line.toLowerCase().startsWith(field) && numericWords.length > 0) {
                            value = numericWords.join(' ');
                        }
                        // Other patterns based on field type
                        else if (field === 'total' || field === 'subtotal' || field === 'amount' || field === 'tax') {
                            // Look for currency formats
                            const currencyMatch = line.match(/[\$€£]\s*[\d,]+\.?\d*/);
                            if (currencyMatch) {
                                value = currencyMatch[0];
                            }
                            else {
                                value = numericWords.join(' ');
                            }
                        }
                        else if (field === 'date' || field === 'due date') {
                            // Look for date formats
                            const dateMatch = line.match(/\d{1,4}[\/-]\d{1,2}[\/-]\d{1,4}|\d{1,2}\s+[A-Za-z]+\s+\d{1,4}/);
                            if (dateMatch) {
                                value = dateMatch[0];
                            }
                            else {
                                value = numericWords.join(' ');
                            }
                        }
                        else {
                            value = numericWords.join(' ');
                        }
                    }
                }
                // If no value found, check next line
                else if (!value && i + 1 < lines.length) {
                    const nextLine = lines[i + 1].trim();
                    if (nextLine && !/\w+\s*:/.test(nextLine)) {
                        value = nextLine;
                    }
                }
                if (value) {
                    const fieldName = field.charAt(0).toUpperCase() + field.slice(1);
                    // Avoid duplicates
                    if (!extractedFields.some(ef => ef.name.toLowerCase() === fieldName.toLowerCase())) {
                        extractedFields.push({
                            name: fieldName,
                            value: value
                        });
                    }
                }
            }
        }
    }
    return extractedFields;
}
class RecordService {
    static async createRecord(data) {
        // Validate title
        if (!data.title || !data.title.trim()) {
            throw new errorHandler_1.AppError(400, 'Record title is required');
        }
        // Validate cabinet exists and get its custom fields configuration
        const cabinet = await cabinet_model_1.Cabinet.findByPk(data.cabinetId);
        if (!cabinet) {
            throw new errorHandler_1.AppError(400, 'Cabinet not found');
        }
        // Validate creator exists
        const creator = await user_model_1.User.findByPk(data.creatorId);
        if (!creator) {
            throw new errorHandler_1.AppError(400, 'Creator not found');
        }
        // Validate custom fields against cabinet configuration
        const validatedFields = await RecordService.validateCustomFields(data.customFields, cabinet.customFields);
        // Find the first attachment field if any
        let fileInfo = null;
        for (const fieldId in validatedFields) {
            const field = validatedFields[fieldId];
            if (field.type === 'Attachment' && field.value) {
                fileInfo = field.value;
                break;
            }
        }
        // Start a transaction for the record creation
        const transaction = await sequelize_2.sequelize.transaction();
        try {
            // Create record with validated fields and file information
            const record = await record_model_1.Record.create(Object.assign(Object.assign(Object.assign({}, data), { title: data.title.trim(), customFields: validatedFields, lastModifiedBy: data.creatorId, version: 1 }), (fileInfo && {
                fileName: fileInfo.fileName,
                filePath: fileInfo.filePath,
                fileSize: fileInfo.fileSize,
                fileType: fileInfo.fileType,
                fileHash: fileInfo.fileHash,
            })), { transaction });
            // If a PDF file was provided, try to process it but don't fail record creation if it fails
            if (data.pdfFile) {
                try {
                    // Process PDF with proper error handling
                    let pdfData;
                    try {
                        pdfData = await extractPdfContent(data.pdfFile);
                    }
                    catch (pdfError) {
                        console.error('PDF processing error (non-fatal):', pdfError);
                        // Use fallback data when PDF processing fails
                        pdfData = {
                            extractedText: 'PDF text extraction failed',
                            extractedFields: [
                                { name: 'Document Name', value: data.pdfFile.originalname },
                                { name: 'File Size', value: `${Math.round(data.pdfFile.size / 1024)} KB` }
                            ],
                            pageCount: 1
                        };
                    }
                    // Generate a unique filename for the PDF
                    const timestamp = Date.now();
                    const pdfFileName = `${timestamp}-${data.pdfFile.originalname.replace(/\s+/g, '_')}`;
                    const pdfFilePath = path_1.default.join(UPLOAD_DIR, pdfFileName);
                    // Ensure upload directory exists
                    if (!fs_1.default.existsSync(UPLOAD_DIR)) {
                        fs_1.default.mkdirSync(UPLOAD_DIR, { recursive: true });
                    }
                    // Save the PDF file to disk
                    await writeFileAsync(pdfFilePath, data.pdfFile.buffer);
                    // Create a new PDF file record
                    await pdf_file_model_1.PdfFile.create({
                        recordId: record.id,
                        originalFileName: data.pdfFile.originalname,
                        filePath: pdfFilePath,
                        fileSize: data.pdfFile.size,
                        fileHash: 'N/A', // In a real implementation, would calculate an actual hash
                        pageCount: pdfData.pageCount,
                        extractedText: pdfData.extractedText,
                        extractedMetadata: {
                            fields: pdfData.extractedFields
                        }
                    }, { transaction });
                }
                catch (pdfStoreError) {
                    // Log error but continue with record creation
                    console.error('Failed to store PDF file (continuing with record creation):', pdfStoreError);
                }
            }
            // Commit the transaction
            await transaction.commit();
            return record;
        }
        catch (error) {
            // Rollback transaction in case of error
            await transaction.rollback();
            throw error;
        }
    }
    /**
     * Process a PDF file to extract text and metadata
     */
    static async processPdfFile(file) {
        try {
            return await extractPdfContent(file);
        }
        catch (error) {
            console.error('Error in processPdfFile:', error);
            // Return basic information even if detailed extraction fails
            return {
                extractedText: 'PDF text extraction failed',
                extractedFields: [
                    { name: 'Document Name', value: file.originalname },
                    { name: 'File Size', value: `${Math.round(file.size / 1024)} KB` }
                ],
                pageCount: 1
            };
        }
    }
    /**
     * Get a record with its PDF file
     */
    static async getRecordWithPdf(id) {
        const record = await record_model_1.Record.findByPk(id, {
            include: [
                {
                    model: cabinet_model_1.Cabinet,
                    as: 'cabinet'
                },
                {
                    model: user_model_1.User,
                    as: 'creator'
                },
                {
                    model: pdf_file_model_1.PdfFile,
                    as: 'pdfFile'
                },
                {
                    model: record_note_comment_model_1.RecordNoteComment,
                    as: 'notes',
                    where: { type: 'note' },
                    required: false,
                    include: [{
                            model: user_model_1.User,
                            as: 'creator',
                            attributes: ['id', 'firstName', 'lastName']
                        }],
                    order: [['createdAt', 'DESC']],
                    limit: 1
                },
                {
                    model: record_note_comment_model_1.RecordNoteComment,
                    as: 'comments',
                    where: { type: 'comment' },
                    required: false,
                    include: [{
                            model: user_model_1.User,
                            as: 'creator',
                            attributes: ['id', 'firstName', 'lastName']
                        }],
                    order: [['createdAt', 'DESC']]
                }
            ]
        });
        if (!record) {
            throw new errorHandler_1.AppError(400, 'Record not found');
        }
        return record;
    }
    static async validateCustomFields(submittedFields, cabinetFields) {
        const validatedFields = {};
        for (const field of cabinetFields) {
            // console.log(`Processing field: ${field.name} (${field.type})`);
            const submittedField = submittedFields[field.id];
            // console.log('Submitted field value:', submittedField);
            // Handle mandatory field validation
            if (field.isMandatory) {
                // console.log(`Field ${field.name} is mandatory`);
                if (field.type === 'Attachment') {
                    // For attachment fields, check if there's a valid value object
                    const hasValidValue = submittedField &&
                        ((submittedField.value && Object.keys(submittedField.value).length > 0) ||
                            (typeof submittedField === 'object' && (submittedField.filePath || submittedField.fileName)));
                    // console.log('Attachment field validation:', {
                    //  hasValidValue,
                    //  submittedField: submittedField
                    //});
                    if (!hasValidValue) {
                        throw new errorHandler_1.AppError(400, `Field '${field.name}' is mandatory`);
                    }
                }
                else {
                    // For non-attachment fields
                    const hasValue = submittedField !== undefined && submittedField !== null && submittedField !== '';
                    // console.log('Non-attachment field validation:', {
                    //  hasValue,
                    //  submittedField: submittedField
                    //});
                    if (!hasValue) {
                        throw new errorHandler_1.AppError(400, `Field '${field.name}' is mandatory`);
                    }
                }
            }
            // Process the field based on its type
            if (field.type === 'Attachment') {
                if (submittedField) {
                    validatedFields[field.id] = {
                        fieldId: field.id,
                        type: field.type,
                        value: submittedField
                    };
                }
            }
            else {
                if (submittedField !== undefined) {
                    validatedFields[field.id] = {
                        fieldId: field.id,
                        type: field.type,
                        value: await RecordService.validateFieldValue(submittedField, field)
                    };
                }
            }
            // console.log(`Validated field ${field.name}:`, validatedFields[field.id]);
        }
        return validatedFields;
    }
    static async validateFieldValue(value, field) {
        if (value === undefined || value === null) {
            return null;
        }
        // Extract value from complex object if needed
        const actualValue = typeof value === 'object' && value !== null
            ? value.value !== undefined ? value.value : value
            : value;
        switch (field.type) {
            case 'Text/Number with Special Symbols':
                // Handle null, undefined, or empty string
                if (actualValue === null || actualValue === undefined || actualValue === '') {
                    return null;
                }
                // Convert to string if it's a number
                const stringValue = typeof actualValue === 'number' ? actualValue.toString() : actualValue;
                // Check if it's a string
                if (typeof stringValue !== 'string') {
                    throw new errorHandler_1.AppError(400, `Field '${field.name}' must be text, number or special symbols`);
                }
                // Check character limit if specified
                if (field.characterLimit && stringValue.length > field.characterLimit) {
                    throw new errorHandler_1.AppError(400, `Field '${field.name}' exceeds character limit of ${field.characterLimit}`);
                }
                // Allow any combination of text, numbers and special symbols
                return stringValue;
            case 'Text Only':
                // Handle object with value property
                const textValue = typeof actualValue === 'object' && actualValue !== null && 'value' in actualValue
                    ? actualValue.value
                    : actualValue;
                if (typeof textValue !== 'string') {
                    throw new errorHandler_1.AppError(400, `Field '${field.name}' must be text`);
                }
                if (field.characterLimit && textValue.length > field.characterLimit) {
                    throw new errorHandler_1.AppError(400, `Field '${field.name}' exceeds character limit of ${field.characterLimit}`);
                }
                return textValue;
            case 'Number Only':
                // Handle null, undefined, or empty string
                if (actualValue === null || actualValue === undefined || actualValue === '') {
                    return null;
                }
                // If value is already a number, use it directly
                if (typeof actualValue === 'number') {
                    if (isNaN(actualValue)) {
                        throw new errorHandler_1.AppError(400, `Field '${field.name}' must be a valid number`);
                    }
                    return actualValue;
                }
                // If value is a string, try to parse it
                if (typeof actualValue === 'string') {
                    const num = parseFloat(actualValue.trim());
                    if (isNaN(num)) {
                        throw new errorHandler_1.AppError(400, `Field '${field.name}' must be a valid number`);
                    }
                    return num;
                }
                throw new errorHandler_1.AppError(400, `Field '${field.name}' must be a valid number`);
            case 'Currency':
                const amount = Number(actualValue);
                if (isNaN(amount)) {
                    throw new errorHandler_1.AppError(400, `Field '${field.name}' must be a valid currency amount`);
                }
                return amount;
            case 'Date':
            case 'Time':
            case 'Time and Date':
                // If the value is already an ISO string, return it
                if (typeof actualValue === 'string' && !isNaN(new Date(actualValue).getTime())) {
                    return actualValue;
                }
                const date = new Date(actualValue);
                if (isNaN(date.getTime())) {
                    throw new errorHandler_1.AppError(400, `Field '${field.name}' must be a valid date/time`);
                }
                return date.toISOString();
            case 'Yes/No':
                if (typeof actualValue !== 'boolean') {
                    throw new errorHandler_1.AppError(400, `Field '${field.name}' must be a boolean`);
                }
                return actualValue;
            case 'Tags/Labels':
                if (!Array.isArray(actualValue)) {
                    throw new errorHandler_1.AppError(400, `Field '${field.name}' must be an array of tags`);
                }
                return actualValue;
            case 'Attachment':
                if (!actualValue || typeof actualValue !== 'object') {
                    throw new errorHandler_1.AppError(400, `Field '${field.name}' must be a valid file upload`);
                }
                if (!actualValue.fileName || !actualValue.filePath) {
                    throw new errorHandler_1.AppError(400, `Field '${field.name}' is missing required file information`);
                }
                return actualValue;
            default:
                return actualValue;
        }
    }
    static async getRecordById(id) {
        // const versions = await RecordOtherVersion.findAll({
        //   where: { originalRecordId : id },
        //   order: [['version', 'ASC']],
        // });
        // if (versions && versions.length > 0) {
        //   // Versiyalar varsa, sonuncusunu plain obyektə çeviririk
        //   const latestVersion = versions[versions.length - 1].get({ plain: true });
        //   // customFields-i işləyirik (əgər lazımdır)
        //   if (latestVersion.customFields) {
        //     for (const fieldId in latestVersion.customFields) {
        //       const field = latestVersion.customFields[fieldId];
        //       if (field.type === 'Attachment' && field.value) {
        //         field.value = {
        //           fileName: field.value.fileName || field.fileName,
        //           filePath: field.value.filePath || field.filePath,
        //           fileSize: field.value.fileSize || field.fileSize,
        //           fileType: field.value.fileType || field.fileType,
        //           fileHash: field.value.fileHash || field.fileHash,
        //         };
        //       }
        //     }
        //   }
        //   return latestVersion;
        // } else {
        const record = await record_model_1.Record.findByPk(id, {
            include: [
                {
                    model: cabinet_model_1.Cabinet,
                    as: 'cabinet'
                },
                {
                    model: user_model_1.User,
                    as: 'creator',
                    attributes: ['id', 'firstName', 'lastName', 'avatar']
                },
                {
                    model: record_note_comment_model_1.RecordNoteComment,
                    as: 'notes',
                    where: { type: 'note' },
                    required: false,
                    include: [{
                            model: user_model_1.User,
                            as: 'creator',
                            attributes: ['id', 'firstName', 'lastName', 'avatar']
                        }],
                    order: [['createdAt', 'DESC']],
                    limit: 1 // Get only the latest note
                },
                {
                    model: record_note_comment_model_1.RecordNoteComment,
                    as: 'comments',
                    where: { type: 'comment' },
                    required: false,
                    include: [{
                            model: user_model_1.User,
                            as: 'creator',
                            attributes: ['id', 'firstName', 'lastName', 'avatar']
                        }],
                    order: [['createdAt', 'DESC']]
                }
            ],
            attributes: {
                include: [
                    'id', 'title', 'description', 'cabinetId', 'creatorId',
                    'filePath', 'fileName', 'fileSize', 'fileType', 'fileHash',
                    'version', 'status', 'metadata', 'customFields', 'tags',
                    'isTemplate', 'isActive', 'lastModifiedBy', 'createdAt', 'updatedAt'
                ]
            }
        });
        if (!record) {
            throw new errorHandler_1.AppError(400, 'Record not found');
        }
        // Process customFields to ensure file information is properly structured
        if (record.customFields) {
            for (const fieldId in record.customFields) {
                const field = record.customFields[fieldId];
                if (field.type === 'Attachment' && field.value) {
                    // Ensure file information is properly structured in customFields
                    field.value = {
                        fileName: field.value.fileName || field.fileName,
                        filePath: field.value.filePath || field.filePath,
                        fileSize: field.value.fileSize || field.fileSize,
                        fileType: field.value.fileType || field.fileType,
                        fileHash: field.value.fileHash || field.fileHash
                    };
                }
            }
        }
        return record;
        //}
    }
    static async getOtherRecordsByOriginalId(originalRecordId) {
        const versions = await recordOtherVersion_model_1.default.findAll({
            where: { originalRecordId },
            order: [['version', 'ASC']],
        });
        if (!versions || versions.length === 0) {
            throw new errorHandler_1.AppError(404, 'No versions found for this record');
        }
        versions.forEach((version) => {
            if (version.customFields) {
                for (const fieldId in version.customFields) {
                    const field = version.customFields[fieldId];
                    if (field.type === 'Attachment' && field.value) {
                        field.value = {
                            fileName: field.value.fileName || field.fileName,
                            filePath: field.value.filePath || field.filePath,
                            fileSize: field.value.fileSize || field.fileSize,
                            fileType: field.value.fileType || field.fileType,
                            fileHash: field.value.fileHash || field.fileHash,
                        };
                    }
                }
            }
        });
        return versions;
    }
    static async deleteRecord(id, userId) {
        var _a;
        const record = await record_model_1.Record.findByPk(id, {
            include: [
                {
                    model: record_version_model_1.RecordVersion,
                    as: 'versions'
                },
                {
                    model: cabinet_model_1.Cabinet,
                    as: 'cabinet',
                    required: true
                }
            ]
        });
        if (!record) {
            throw new errorHandler_1.AppError(404, 'Record not found');
        }
        if (!record.cabinet) {
            throw new errorHandler_1.AppError(404, 'Cabinet not found');
        }
        // Check if user has permission (creator, cabinet owner, approver, or member_full)
        const isCreator = record.creatorId === userId;
        const isCabinetOwner = record.cabinet.createdById === userId;
        const isApprover = (_a = record.cabinet.approvers) === null || _a === void 0 ? void 0 : _a.some((approver) => approver.userId === userId);
        // Check if user is a member_full
        const member = await cabinet_member_model_1.CabinetMember.findOne({
            where: {
                cabinetId: record.cabinet.id,
                userId: userId,
                role: 'member_full'
            }
        });
        const isMemberFull = !!member;
        if (!isCreator && !isCabinetOwner && !isApprover && !isMemberFull) {
            throw new errorHandler_1.AppError(403, 'You do not have permission to delete this record');
        }
        // Start a transaction to ensure all deletions are atomic
        const transaction = await sequelize_2.sequelize.transaction();
        try {
            // Delete all versions first
            await record_version_model_1.RecordVersion.destroy({
                where: { recordId: id },
                transaction
            });
            // Then delete the record
            await record.destroy({ transaction });
            // If all operations are successful, commit the transaction
            await transaction.commit();
            return true;
        }
        catch (error) {
            // If any operation fails, rollback the transaction
            await transaction.rollback();
            throw error;
        }
    }
    static async getRecordsByStatus(status, creatorId) {
        const whereClause = {
            status: Array.isArray(status) ? { [sequelize_1.Op.in]: status } : status
        };
        if (creatorId) {
            whereClause[sequelize_1.Op.or] = [
                { creatorId },
                sequelize_2.sequelize.literal(`"cabinet"."approvers" @> '[{"userId": "${creatorId}"}]'`),
                // Add check for cabinet_members with role 'member_full'
                sequelize_2.sequelize.literal(`EXISTS (
          SELECT 1 FROM cabinet_members cm 
          WHERE cm.cabinet_id = "cabinet"."id" 
          AND cm.user_id = '${creatorId}'
          AND cm.role = 'member_full'
        )`)
            ];
        }
        return record_model_1.Record.findAll({
            where: whereClause,
            include: [
                {
                    model: cabinet_model_1.Cabinet,
                    as: 'cabinet',
                    attributes: ['id', 'name', 'description']
                },
                {
                    model: user_model_1.User,
                    as: 'creator',
                    attributes: ['id', 'firstName', 'lastName', 'email']
                }
            ],
            order: [['createdAt', 'DESC']]
        });
    }
    static async createNewVersion(recordId, versionData) {
        const record = await record_model_1.Record.findByPk(recordId);
        if (!record) {
            throw new errorHandler_1.AppError(404, 'Record not found');
        }
        // Get the current version number and increment it
        const latestVersion = await record_version_model_1.RecordVersion.findOne({
            where: { recordId },
            order: [['version', 'DESC']],
        });
        const newVersionNumber = latestVersion ? latestVersion.version + 1 : 1;
        // Create new version
        const version = await record_version_model_1.RecordVersion.create(Object.assign({ recordId, version: newVersionNumber }, versionData));
        // Update the record with the latest file info
        await record.update({
            filePath: versionData.filePath,
            fileName: versionData.fileName,
            fileSize: versionData.fileSize,
            fileType: versionData.fileType,
            fileHash: versionData.fileHash,
            version: newVersionNumber,
            lastModifiedBy: versionData.uploadedBy,
        });
        return version;
    }
    static async getRecordVersions(recordId) {
        const record = await record_model_1.Record.findByPk(recordId);
        if (!record) {
            throw new errorHandler_1.AppError(404, 'Record not found');
        }
        const versions = await record_version_model_1.RecordVersion.findAll({
            where: { recordId },
            order: [['version', 'DESC']],
            include: [
                {
                    model: record_model_1.Record,
                    as: 'record',
                    attributes: ['title'],
                },
            ],
        });
        return versions;
    }
    static async deleteVersion(recordId, versionId, userId) {
        const record = await record_model_1.Record.findByPk(recordId);
        if (!record) {
            throw new errorHandler_1.AppError(404, 'Record not found');
        }
        // Check if user has permission (creator or cabinet owner)
        const cabinet = await cabinet_model_1.Cabinet.findByPk(record.cabinetId);
        if (!cabinet) {
            throw new errorHandler_1.AppError(404, 'Cabinet not found');
        }
        if (record.creatorId !== userId && cabinet.createdById !== userId) {
            throw new errorHandler_1.AppError(403, 'You do not have permission to delete this version');
        }
        const version = await record_version_model_1.RecordVersion.findOne({
            where: { id: versionId, recordId }
        });
        if (!version) {
            throw new errorHandler_1.AppError(404, 'Version not found');
        }
        // Don't allow deletion of the only version
        const versionsCount = await record_version_model_1.RecordVersion.count({ where: { recordId } });
        if (versionsCount === 1) {
            throw new errorHandler_1.AppError(400, 'Cannot delete the only version of the record');
        }
        // If deleting the latest version, update record to point to the previous version
        if (version.version === record.version) {
            const previousVersion = await record_version_model_1.RecordVersion.findOne({
                where: { recordId, version: { [sequelize_1.Op.lt]: version.version } },
                order: [['version', 'DESC']],
            });
            if (previousVersion) {
                await record.update({
                    filePath: previousVersion.filePath,
                    fileName: previousVersion.fileName,
                    fileSize: previousVersion.fileSize,
                    fileType: previousVersion.fileType,
                    fileHash: previousVersion.fileHash,
                    version: previousVersion.version,
                    lastModifiedBy: userId,
                });
            }
        }
        // Delete the version
        await version.destroy();
        return true;
    }
    static async updateRecord(id, data, userId) {
        const transaction = await sequelize_2.sequelize.transaction();
        try {
            // Mövcud recordu tapırıq
            const record = await record_model_1.Record.findByPk(id);
            if (!record) {
                throw new errorHandler_1.AppError(404, 'Record not found');
            }
            // Recordu update edirik
            await record.update(Object.assign(Object.assign({}, data), { lastModifiedBy: userId }), { transaction });
            // Əgər comment varsa, comment əlavə edirik
            if (data.comments) {
                await record_note_comment_model_1.RecordNoteComment.create({
                    recordId: id,
                    content: data.comments,
                    type: 'comment',
                    createdBy: userId,
                }, { transaction });
            }
            // Transactionu commit edirik
            await transaction.commit();
            // Activity log əməliyyatını həyata keçiririk
            await activity_service_1.ActivityService.logActivity({
                userId,
                action: activity_model_1.ActivityType.UPDATE,
                resourceType: activity_model_1.ResourceType.RECORD,
                resourceId: id,
                resourceName: record.title,
                details: data.note || 'Record updated',
            });
            // Kabinetin approverlərinə bildiriş göndəririk
            const cabinet = await cabinet_model_1.Cabinet.findByPk(record.cabinetId);
            // if (cabinet && cabinet.approvers && cabinet.approvers.length > 0) {
            //   await Promise.all(
            //     cabinet.approvers.map((approver: { userId: string }) =>
            //       NotificationService.createNotification({
            //         userId: approver.userId,
            //         title: 'Record Updated',
            //         message: `Record "${record.title}" has been updated.`,
            //         type: 'record_update',
            //         entityType: 'record',
            //         entityId: record.id,
            //       })
            //     )
            //   );
            // }
            if (cabinet) {
                await notification_service_1.NotificationService.createNotification({
                    userId: cabinet.createdById,
                    title: 'Record Updated',
                    message: `Record "${record.title}" has been updated.`,
                    type: 'record_update',
                    entityType: 'record',
                    entityId: record.id
                });
            }
            // Yenilənmiş recordu, note və comment-ləri ilə birlikdə əldə edirik
            const updatedRecord = await record_model_1.Record.findByPk(id, {
                include: [
                    {
                        model: cabinet_model_1.Cabinet,
                        as: 'cabinet',
                    },
                    {
                        model: user_model_1.User,
                        as: 'creator',
                    },
                    {
                        model: record_note_comment_model_1.RecordNoteComment,
                        as: 'notes',
                        where: { type: 'note' },
                        required: false,
                        include: [
                            {
                                model: user_model_1.User,
                                as: 'creator',
                                attributes: ['id', 'firstName', 'lastName', 'avatar'],
                            },
                        ],
                        order: [['createdAt', 'DESC']],
                    },
                    {
                        model: record_note_comment_model_1.RecordNoteComment,
                        as: 'comments',
                        where: { type: 'comment' },
                        required: false,
                        include: [
                            {
                                model: user_model_1.User,
                                as: 'creator',
                                attributes: ['id', 'firstName', 'lastName', 'avatar'],
                            },
                        ],
                        order: [['createdAt', 'DESC']],
                    },
                ],
                attributes: {
                    include: [
                        'id',
                        'title',
                        'description',
                        'cabinetId',
                        'creatorId',
                        'filePath',
                        'fileName',
                        'fileSize',
                        'fileType',
                        'fileHash',
                        'version',
                        'status',
                        'metadata',
                        'customFields',
                        'tags',
                        'isTemplate',
                        'isActive',
                        'lastModifiedBy',
                        'createdAt',
                        'updatedAt',
                    ],
                },
            });
            if (!updatedRecord) {
                throw new errorHandler_1.AppError(404, 'Updated record not found');
            }
            // customFields məlumatının strukturunu təmin edirik (əgər varsa)
            if (updatedRecord.customFields) {
                for (const fieldId in updatedRecord.customFields) {
                    const field = updatedRecord.customFields[fieldId];
                    if (field.type === 'Attachment' && field.value) {
                        field.value = {
                            fileName: field.value.fileName || field.fileName,
                            filePath: field.value.filePath || field.filePath,
                            fileSize: field.value.fileSize || field.fileSize,
                            fileType: field.value.fileType || field.fileType,
                            fileHash: field.value.fileHash || field.fileHash,
                        };
                    }
                }
            }
            return updatedRecord;
        }
        catch (error) {
            try {
                // Əgər error varsa, transactionu rollback edirik
                await transaction.rollback();
            }
            catch (rollbackError) {
                console.error('Rollback failed:', rollbackError);
            }
            throw error;
        }
    }
    static async modifyRecord(data) {
        // Əvvəlcə mövcud recordu tapırıq
        const originalRecord = await record_model_1.Record.findByPk(data.recordId);
        if (!originalRecord) {
            throw new errorHandler_1.AppError(404, 'Record not found');
        }
        // Kabinet və yaradan istifadəçini yoxlayırıq
        const cabinet = await cabinet_model_1.Cabinet.findByPk(data.cabinetId);
        if (!cabinet) {
            throw new errorHandler_1.AppError(400, 'Cabinet not found');
        }
        const creator = await user_model_1.User.findByPk(data.creatorId);
        if (!creator) {
            throw new errorHandler_1.AppError(400, 'Creator not found');
        }
        // Custom field-ləri kabinetin konfiqurasiyası ilə yoxlaya bilərik (əvvəlki nümunəyə bənzər)
        const validatedFields = await RecordService.validateCustomFields(data.customFields, cabinet.customFields);
        // Mövcud record üçün son versiyanı tapırıq
        const latestVersion = await recordOtherVersion_model_1.default.findOne({
            where: { originalRecordId: data.recordId },
            order: [['version', 'DESC']],
        });
        const newVersion = latestVersion ? latestVersion.version + 1 : 2;
        // PDF faylı varsa, onu işləyirik
        let pdfFileInfo = null;
        if (data.pdfFile) {
            try {
                let pdfData;
                try {
                    pdfData = await extractPdfContent(data.pdfFile);
                }
                catch (pdfError) {
                    console.error('PDF processing error (non-fatal):', pdfError);
                    pdfData = {
                        extractedText: 'PDF text extraction failed',
                        extractedFields: [
                            { name: 'Document Name', value: data.pdfFile.originalname },
                            { name: 'File Size', value: `${Math.round(data.pdfFile.size / 1024)} KB` },
                        ],
                        pageCount: 1,
                    };
                }
                const timestamp = Date.now();
                const pdfFileName = `${timestamp}-${data.pdfFile.originalname.replace(/\s+/g, '_')}`;
                const pdfFilePath = path_1.default.join(UPLOAD_DIR, pdfFileName);
                if (!fs_1.default.existsSync(UPLOAD_DIR)) {
                    fs_1.default.mkdirSync(UPLOAD_DIR, { recursive: true });
                }
                await writeFileAsync(pdfFilePath, data.pdfFile.buffer);
                pdfFileInfo = {
                    fileName: data.pdfFile.originalname,
                    filePath: pdfFilePath,
                    fileSize: data.pdfFile.size,
                    fileType: data.pdfFile.mimetype,
                    fileHash: 'N/A', // Əgər lazımdırsa, hash hesablanmalıdır
                    pageCount: pdfData.pageCount,
                };
            }
            catch (err) {
                console.error('Failed to process PDF file', err);
            }
        }
        // Transaction daxilində yeni versiyanı yaradırıq
        const transaction = await sequelize_2.sequelize.transaction();
        try {
            const newRecordVersion = await recordOtherVersion_model_1.default.create(Object.assign({ originalRecordId: data.recordId, title: data.title.trim(), description: originalRecord.description, cabinetId: data.cabinetId, creatorId: data.creatorId, customFields: validatedFields, status: data.status, tags: data.tags, isTemplate: originalRecord.isTemplate, isActive: originalRecord.isActive, lastModifiedBy: data.creatorId, version: newVersion }, (pdfFileInfo && {
                fileName: pdfFileInfo.fileName,
                filePath: pdfFileInfo.filePath,
                fileSize: pdfFileInfo.fileSize,
                fileType: pdfFileInfo.fileType,
                fileHash: pdfFileInfo.fileHash,
            })), { transaction });
            await transaction.commit();
            await activity_service_1.ActivityService.logActivity({
                userId: data.creatorId,
                action: activity_model_1.ActivityType.UPDATE,
                resourceType: activity_model_1.ResourceType.RECORD,
                resourceId: data.recordId,
                resourceName: data.title,
                details: 'Record modified',
            });
            // Notification göndərilir (məsələn, kabinetin yaradan istifadəçiyə)
            await notification_service_1.NotificationService.createNotification({
                userId: cabinet.createdById,
                title: 'Record Modified',
                message: `Record "${data.title}" has been modified. New version: ${newVersion}`,
                type: 'record_update',
                entityType: 'record',
                entityId: data.recordId,
            });
            // await transaction.commit();
            return newRecordVersion;
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    static async approveRecord(recordId, userId, note, data) {
        const transaction = await sequelize_2.sequelize.transaction();
        try {
            const record = await record_model_1.Record.findByPk(recordId);
            if (!record) {
                throw new errorHandler_1.AppError(404, 'Record not found');
            }
            // Redaktə olunmuş məlumatlar daxil olmaqla update edilir
            await record.update(Object.assign(Object.assign({}, data), { status: record_model_1.RecordStatus.APPROVED, lastModifiedBy: userId }), { transaction });
            await record_note_comment_model_1.RecordNoteComment.create({
                recordId,
                content: note || 'Record approved',
                type: 'system',
                action: 'approve',
                createdBy: userId
            }, { transaction });
            await transaction.commit();
            // Commitdən sonra Notification və activity log əməliyyatları
            await activity_service_1.ActivityService.logActivity({
                userId,
                action: activity_model_1.ActivityType.APPROVE,
                resourceType: activity_model_1.ResourceType.RECORD,
                resourceId: recordId,
                resourceName: record.title,
                details: 'Record approved'
            });
            if (notification_service_1.NotificationService.createRecordApprovalNotification) {
                await notification_service_1.NotificationService.createRecordApprovalNotification(record.creatorId, recordId, record.title);
            }
            const updatedRecord = await record_model_1.Record.findByPk(recordId, {
                include: [
                    {
                        model: record_note_comment_model_1.RecordNoteComment,
                        as: 'notes',
                        where: { type: 'note' },
                        required: false,
                        include: [{
                                model: user_model_1.User,
                                as: 'creator',
                                attributes: ['id', 'firstName', 'lastName']
                            }]
                    },
                    {
                        model: record_note_comment_model_1.RecordNoteComment,
                        as: 'comments',
                        where: { type: 'comment' },
                        required: false,
                        include: [{
                                model: user_model_1.User,
                                as: 'creator',
                                attributes: ['id', 'firstName', 'lastName']
                            }]
                    }
                ]
            });
            return updatedRecord;
        }
        catch (error) {
            try {
                await transaction.rollback();
            }
            catch (rollbackError) {
                console.error('Rollback failed:', rollbackError);
            }
            throw error;
        }
    }
    static async rejectRecord(recordId, userId, note, comments, data) {
        var _a, _b;
        const transaction = await sequelize_2.sequelize.transaction();
        try {
            const record = await record_model_1.Record.findByPk(recordId, {
                include: [{ model: cabinet_model_1.Cabinet, as: 'cabinet' }],
                transaction
            });
            if (!record || !record.cabinet) {
                throw new errorHandler_1.AppError(404, 'Record or cabinet not found');
            }
            const cabinet = await cabinet_model_1.Cabinet.findByPk(record.cabinetId, { transaction });
            if (!cabinet) {
                throw new errorHandler_1.AppError(404, 'Cabinet not found');
            }
            const isApprover = (_b = (_a = cabinet.approvers) === null || _a === void 0 ? void 0 : _a.some(approver => approver.userId === userId)) !== null && _b !== void 0 ? _b : false;
            if (!isApprover) {
                const cabinetMember = await cabinet_member_model_1.CabinetMember.findOne({
                    where: { cabinetId: record.cabinetId, userId: userId, role: 'member_full' },
                    transaction
                });
                if (!cabinetMember) {
                    throw new errorHandler_1.AppError(403, 'User is not authorized to reject this record');
                }
            }
            if (record.status !== record_model_1.RecordStatus.PENDING) {
                throw new errorHandler_1.AppError(400, 'Only pending records can be rejected');
            }
            console.log('Rejecting record data:', data, 'by user:', userId);
            await record.update(Object.assign(Object.assign({}, data), { status: record_model_1.RecordStatus.REJECTED, lastModifiedBy: userId }), { transaction });
            // if (note) {
            //   await RecordNoteComment.create({
            //     recordId,
            //     content: note,
            //     type: 'note',
            //     action: 'reject',
            //     createdBy: userId
            //   }, { transaction });
            // }
            if (comments) {
                await record_note_comment_model_1.RecordNoteComment.create({
                    recordId,
                    content: comments,
                    type: 'comment',
                    action: 'reject',
                    createdBy: userId
                }, { transaction });
            }
            await transaction.commit();
            await activity_service_1.ActivityService.logActivity({
                userId,
                action: activity_model_1.ActivityType.REJECT,
                resourceType: activity_model_1.ResourceType.RECORD,
                resourceId: recordId,
                resourceName: record.title,
                details: note || 'Record rejected'
            });
            if (notification_service_1.NotificationService.createRecordRejectionNotification) {
                await notification_service_1.NotificationService.createRecordRejectionNotification(record.creatorId, recordId, record.title, note || '');
            }
            const updatedRecord = await record_model_1.Record.findByPk(recordId, {
                include: [
                    {
                        model: user_model_1.User,
                        as: 'creator',
                        attributes: ['id', 'firstName', 'lastName']
                    },
                    {
                        model: cabinet_model_1.Cabinet,
                        as: 'cabinet'
                    },
                    {
                        model: record_note_comment_model_1.RecordNoteComment,
                        as: 'notes',
                        where: { type: 'note' },
                        required: false,
                        include: [{
                                model: user_model_1.User,
                                as: 'creator',
                                attributes: ['id', 'firstName', 'lastName']
                            }],
                        order: [['createdAt', 'DESC']]
                    },
                    {
                        model: record_note_comment_model_1.RecordNoteComment,
                        as: 'comments',
                        where: { type: 'comment' },
                        required: false,
                        include: [{
                                model: user_model_1.User,
                                as: 'creator',
                                attributes: ['id', 'firstName', 'lastName']
                            }],
                        order: [['createdAt', 'DESC']]
                    }
                ]
            });
            return updatedRecord;
        }
        catch (error) {
            try {
                await transaction.rollback();
            }
            catch (rollbackError) {
                console.error('Rollback failed:', rollbackError);
            }
            throw error;
        }
    }
    static async getCabinetRecords(cabinetId, page = 1, limit = 10) {
        try {
            const offset = (page - 1) * limit;
            const { rows: records, count } = await record_model_1.Record.findAndCountAll({
                where: {
                    cabinetId,
                    isActive: true,
                    [sequelize_1.Op.or]: [
                        { deletedAt: null },
                        { deletedAt: { [sequelize_1.Op.gt]: new Date() } }
                    ]
                },
                include: [
                    {
                        model: user_model_1.User,
                        as: 'creator',
                        attributes: ['id', 'firstName', 'lastName', 'avatar']
                    },
                    {
                        model: cabinet_model_1.Cabinet,
                        as: 'cabinet',
                        attributes: ['id', 'name']
                    },
                    {
                        model: record_note_comment_model_1.RecordNoteComment,
                        as: 'notes',
                        where: { type: 'note' },
                        required: false,
                        limit: 1,
                        order: [['createdAt', 'DESC']],
                        include: [{
                                model: user_model_1.User,
                                as: 'creator',
                                attributes: ['id', 'firstName', 'lastName']
                            }]
                    }
                ],
                order: [['createdAt', 'DESC']],
                limit,
                offset,
                distinct: true
            });
            // Transform records to match frontend interface
            const transformedRecords = records.map(record => {
                var _a;
                const creator = record.get('creator');
                const cabinet = record.get('cabinet');
                const notes = record.get('notes');
                return {
                    id: record.id,
                    key: record.id,
                    recordName: record.title,
                    status: record.status,
                    createdBy: {
                        id: creator.id,
                        firstName: creator.firstName,
                        lastName: creator.lastName,
                        avatar: creator.avatar
                    },
                    createdAt: record.createdAt,
                    priority: ((_a = record.metadata) === null || _a === void 0 ? void 0 : _a.priority) || 'Medium',
                    cabinet: {
                        id: cabinet.id,
                        name: cabinet.name
                    },
                    latestNote: (notes === null || notes === void 0 ? void 0 : notes[0]) || null
                };
            });
            return {
                records: transformedRecords,
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit)
            };
        }
        catch (err) {
            console.error('Error in getCabinetRecords:', err);
            const error = err;
            throw new errorHandler_1.AppError(error instanceof errorHandler_1.AppError ? error.statusCode : 500, error.message);
        }
    }
    async getRecord(id) {
        return await record_model_1.Record.findOne({
            where: {
                id,
                isActive: true
            },
            include: [
                {
                    model: user_model_1.User,
                    as: 'creator',
                    attributes: ['id', 'firstName', 'lastName', 'avatar']
                },
                {
                    model: cabinet_model_1.Cabinet,
                    as: 'cabinet'
                }
            ]
        });
    }
    static async getMyRecordsByStatus(status, userId) {
        const whereClause = {
            status: Array.isArray(status) ? { [sequelize_1.Op.in]: status } : status,
            creatorId: userId
        };
        return record_model_1.Record.findAll({
            where: whereClause,
            include: [
                {
                    model: cabinet_model_1.Cabinet,
                    as: 'cabinet',
                    attributes: ['id', 'name', 'description']
                },
                {
                    model: user_model_1.User,
                    as: 'creator',
                    attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
                }
            ],
            order: [['createdAt', 'DESC']]
        });
    }
    static async getRecordsWaitingForMyApproval(userId) {
        console.log('Fetching records waiting for approval for user:', userId);
        const getRecord = await record_model_1.Record.findAll({
            where: {
                status: record_model_1.RecordStatus.PENDING
            },
            include: [
                {
                    model: cabinet_model_1.Cabinet,
                    as: 'cabinet',
                    attributes: ['id', 'name', 'description', 'approvers', 'createdById'],
                    required: true,
                    where: {
                        createdById: userId,
                    }
                },
                {
                    model: user_model_1.User,
                    as: 'creator',
                    attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
                }
            ],
            order: [['createdAt', 'DESC']]
        });
        console.log('Records fetched:', getRecord);
        return getRecord;
    }
    static async associateFilesWithRecord(recordId, fileIds) {
        try {
            // Validate that the record exists
            const record = await record_model_1.Record.findByPk(recordId);
            if (!record) {
                throw new errorHandler_1.AppError(404, 'Record not found');
            }
            // Associate files with the record and mark them as allocated
            return await file_service_1.default.associateFilesWithRecord(fileIds, recordId);
        }
        catch (error) {
            console.error('Error associating files with record:', error);
            throw error;
        }
    }
    // Modified createRecord to support multiple file IDs
    static async createRecordWithFiles(data) {
        // Validate title
        if (!data.title || !data.title.trim()) {
            throw new errorHandler_1.AppError(400, 'Record title is required');
        }
        // Validate cabinet exists and get its custom fields configuration
        const cabinet = await cabinet_model_1.Cabinet.findByPk(data.cabinetId);
        if (!cabinet) {
            throw new errorHandler_1.AppError(400, 'Cabinet not found');
        }
        // Validate creator exists
        const creator = await user_model_1.User.findByPk(data.creatorId);
        if (!creator) {
            throw new errorHandler_1.AppError(400, 'Creator not found');
        }
        // Validate custom fields against cabinet configuration
        const validatedFields = await RecordService.validateCustomFields(data.customFields, cabinet.customFields);
        // Find the first attachment field if any
        let fileInfo = null;
        for (const fieldId in validatedFields) {
            const field = validatedFields[fieldId];
            if (field.type === 'Attachment' && field.value) {
                fileInfo = field.value;
                break;
            }
        }
        // Start a transaction for the record creation
        const transaction = await sequelize_2.sequelize.transaction();
        try {
            // Create record with validated fields and file information
            const record = await record_model_1.Record.create(Object.assign(Object.assign(Object.assign({}, data), { title: data.title.trim(), customFields: validatedFields, lastModifiedBy: data.creatorId, version: 1 }), (fileInfo && {
                fileName: fileInfo.fileName,
                filePath: fileInfo.filePath,
                fileSize: fileInfo.fileSize,
                fileType: fileInfo.fileType,
                fileHash: fileInfo.fileHash,
            })), { transaction });
            // Associate files if provided
            if (data.fileIds && data.fileIds.length > 0) {
                // Create associations between the record and the files
                const recordFiles = data.fileIds.map(fileId => ({
                    id: sequelize_2.sequelize.literal('uuid_generate_v4()'),
                    recordId: record.id,
                    fileId: fileId
                }));
                await sequelize_2.sequelize.models.RecordFile.bulkCreate(recordFiles, { transaction });
                // Mark files as allocated
                await sequelize_2.sequelize.models.File.update({ isAllocated: true }, {
                    where: { id: data.fileIds },
                    transaction
                });
            }
            // Commit the transaction
            await transaction.commit();
            return record;
        }
        catch (error) {
            // Rollback transaction in case of error
            await transaction.rollback();
            throw error;
        }
    }
}
exports.RecordService = RecordService;
