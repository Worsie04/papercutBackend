"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecordController = void 0;
const record_service_1 = require("../../services/record.service");
const record_model_1 = require("../../models/record.model");
const errorHandler_1 = require("../middlewares/errorHandler");
const upload_service_1 = require("../../services/upload.service");
const cabinet_model_1 = require("../../models/cabinet.model");
const notification_service_1 = require("../../services/notification.service");
class RecordController {
    static async createRecord(req, res) {
        var _a;
        try {
            const creatorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            const files = req.files;
            // Parse JSON strings from FormData
            const title = req.body.title;
            const cabinetId = req.body.cabinetId;
            const status = req.body.status;
            const isTemplate = req.body.isTemplate === 'true';
            const isActive = req.body.isActive === 'true';
            const tags = JSON.parse(req.body.tags || '[]');
            const customFields = JSON.parse(req.body.customFields || '{}');
            if (!creatorId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            if (!title) {
                return res.status(400).json({ error: 'Title is required' });
            }
            // Handle file uploads for attachment fields
            const processedCustomFields = Object.assign({}, customFields);
            // Find PDF file if present
            let pdfFile;
            if (files && Array.isArray(files)) {
                for (const file of files) {
                    const fieldId = file.fieldname; // multer sets this from the FormData field name
                    // Check if this is a PDF file intended to be processed separately
                    if (fieldId === 'pdfFile' && file.mimetype === 'application/pdf') {
                        pdfFile = file;
                        continue;
                    }
                    if (file) {
                        const uploadResult = await upload_service_1.UploadService.uploadFile(file);
                        processedCustomFields[fieldId] = {
                            fileName: uploadResult.fileName,
                            fileSize: uploadResult.fileSize,
                            fileType: uploadResult.fileType,
                            filePath: uploadResult.filePath,
                            fileHash: uploadResult.fileHash,
                            pageCount: uploadResult.pageCount
                        };
                    }
                }
            }
            const record = await record_service_1.RecordService.createRecord({
                title,
                cabinetId,
                creatorId,
                customFields: processedCustomFields,
                status: status,
                isTemplate,
                isActive,
                tags,
                pdfFile
            });
            // Əvvəlcə, record‑un aid olduğu kabineti tapırıq
            const cabinet = await cabinet_model_1.Cabinet.findByPk(record.cabinetId);
            if (cabinet) {
                await notification_service_1.NotificationService.createNotification({
                    userId: cabinet.createdById,
                    title: 'Yeni Record Yaradıldı',
                    message: `Sizin təsdiqiniz üçün yeni record "${record.title}" yaradıldı.`,
                    type: 'record_creation',
                    entityType: 'record',
                    entityId: record.id
                });
                // 1. Kabinetin approverlərinə bildiriş göndərin (əgər varsa)
                // if (cabinet.approvers && cabinet.approvers.length > 0) {
                //   await Promise.all(
                //     cabinet.approvers.map((approver: { userId: string; order: number }) =>
                //       NotificationService.createNotification({
                //         userId: approver.userId,
                //         title: 'Yeni Record Yaradıldı',
                //         message: `Sizin təsdiqiniz üçün yeni record "${record.title}" yaradıldı.`,
                //         type: 'record_creation',
                //         entityType: 'record',
                //         entityId: record.id
                //       })
                //     )
                //   );
                // }
                // 2. Həmçinin, həmin kabinetin aid olduğu Space‑i yaradan istifadəçiyə bildiriş göndərin
                // const space = await Space.findByPk(cabinet.spaceId);
                // if (space) {
                //   await NotificationService.createNotification({
                //     userId: space.createdById,
                //     title: 'Yeni Record Yaradıldı',
                //     message: `Sizin yaratdığınız Space üçün yeni record "${record.title}" əlavə edildi.`,
                //     type: 'record_creation',
                //     entityType: 'record',
                //     entityId: record.id
                //   });
                // }
            }
            res.status(201).json(record);
        }
        catch (error) {
            console.error('Error creating record:', error);
            if (error instanceof errorHandler_1.AppError) {
                res.status(error.statusCode).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to create record' });
            }
        }
    }
    static async extractPdfFields(req, res) {
        try {
            const files = req.files;
            if (!files || !Array.isArray(files) || files.length === 0) {
                return res.status(400).json({ error: 'At least one PDF file is required' });
            }
            // Check if all files are PDFs
            const nonPdfFiles = files.filter(file => file.mimetype !== 'application/pdf');
            if (nonPdfFiles.length > 0) {
                return res.status(400).json({
                    error: 'All files must be PDFs',
                    invalidFiles: nonPdfFiles.map(f => f.originalname)
                });
            }
            const cabinetId = req.query.cabinetId;
            if (!cabinetId) {
                return res.status(400).json({ error: 'Cabinet ID is required' });
            }
            // Get cabinet with its custom fields
            const cabinet = await cabinet_model_1.Cabinet.findByPk(cabinetId);
            if (!cabinet || !cabinet.customFields) {
                return res.status(404).json({ error: 'Cabinet not found or has no custom fields' });
            }
            const cabinetFields = cabinet.customFields;
            let allExtractedFields = [];
            let allFieldMatches = [];
            // Process each PDF file
            for (const file of files) {
                // Process PDF file to extract fields
                const pdfData = await record_service_1.RecordService.processPdfFile(file);
                // Add source file information to extracted fields
                const extractedFieldsWithSource = pdfData.extractedFields.map(field => (Object.assign(Object.assign({}, field), { sourceFile: file.originalname })));
                // Match extracted fields with cabinet fields
                const fileFieldMatches = extractedFieldsWithSource.map(extractedField => {
                    const matches = cabinetFields
                        .map(cabinetField => ({
                        cabinetField,
                        similarity: calculateStringSimilarity(extractedField.name.toLowerCase(), cabinetField.name.toLowerCase())
                    }))
                        .filter(match => match.similarity > 0.3) // Only keep matches with similarity > 30%
                        .sort((a, b) => b.similarity - a.similarity)
                        .slice(0, 3) // Keep top 3 matches
                        .map(match => ({
                        fieldId: match.cabinetField.id,
                        fieldName: match.cabinetField.name,
                        similarity: match.similarity
                    }));
                    return {
                        extractedField,
                        possibleMatches: matches
                    };
                });
                // Add results from this file to overall results
                allExtractedFields = [...allExtractedFields, ...extractedFieldsWithSource];
                allFieldMatches = [...allFieldMatches, ...fileFieldMatches];
            }
            res.json({
                extractedFields: allExtractedFields,
                fieldMatches: allFieldMatches
            });
        }
        catch (error) {
            console.error('Error processing PDF files:', error);
            res.status(500).json({ error: 'Failed to process PDF files' });
        }
    }
    static async getRecordWithPdf(req, res) {
        try {
            const { id } = req.params;
            const record = await record_service_1.RecordService.getRecordWithPdf(id);
            res.json(record);
        }
        catch (error) {
            console.error('Error getting record with PDF data:', error);
            if (error instanceof errorHandler_1.AppError && error.name === 'NotFoundError') {
                res.status(404).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to get record with PDF data' });
            }
        }
    }
    static async getCabinetRecords(req, res) {
        try {
            const { cabinetId } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const result = await record_service_1.RecordService.getCabinetRecords(cabinetId, page, limit);
            return res.status(200).json(result);
        }
        catch (error) {
            console.error('Error getting cabinet records:', error);
            if (error instanceof errorHandler_1.AppError) {
                res.status(error.statusCode).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to get cabinet records' });
            }
        }
    }
    static async getRecord(req, res) {
        try {
            const { id } = req.params;
            const record = await record_service_1.RecordService.getRecordById(id);
            res.json(record);
        }
        catch (error) {
            console.error('Error getting record:', error);
            if (error instanceof errorHandler_1.AppError && error.name === 'NotFoundError') {
                res.status(404).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to get record' });
            }
        }
    }
    static async getOtherRecords(req, res) {
        try {
            const { id } = req.params;
            console.log('ID:', id);
            const versions = await record_service_1.RecordService.getOtherRecordsByOriginalId(id);
            res.json(versions);
        }
        catch (error) {
            console.error('Error getting other records:', error);
            if (error instanceof errorHandler_1.AppError && error.name === 'NotFoundError') {
                res.status(404).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to get other records' });
            }
        }
    }
    static async deleteRecord(req, res) {
        var _a;
        try {
            const { id } = req.params;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            await record_service_1.RecordService.deleteRecord(id, userId);
            res.json({ message: 'Record deleted successfully' });
        }
        catch (error) {
            console.error('Error deleting record:', error);
            if (error instanceof errorHandler_1.AppError) {
                res.status(error.statusCode).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to delete record' });
            }
        }
    }
    static async getRecordsByStatus(req, res) {
        var _a;
        try {
            const { status } = req.query;
            const creatorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!status) {
                return res.status(400).json({ error: 'Status is required' });
            }
            if (!creatorId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            // Handle comma-separated status values and ensure they're strings
            const statusValues = (typeof status === 'string' ? status.split(',') : [status.toString()])
                .map(s => s.trim())
                .filter(s => s.length > 0);
            // Validate status values
            const validStatuses = Object.values(record_model_1.RecordStatus);
            const invalidStatuses = statusValues.filter(s => !validStatuses.includes(s));
            if (invalidStatuses.length > 0) {
                return res.status(400).json({ error: `Invalid status values: ${invalidStatuses.join(', ')}` });
            }
            const records = await record_service_1.RecordService.getRecordsByStatus(statusValues, creatorId);
            res.json(records);
        }
        catch (error) {
            console.error('Error getting records by status:', error);
            if (error instanceof errorHandler_1.AppError) {
                res.status(error.statusCode).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to get records' });
            }
        }
    }
    static async getFileUrl(req, res) {
        try {
            const { filePath } = req.params;
            const { type } = req.query;
            if (!filePath) {
                return res.status(400).json({ error: 'File path is required' });
            }
            let url;
            if (type === 'view') {
                url = await upload_service_1.UploadService.getFileViewUrl(filePath);
            }
            else {
                url = await upload_service_1.UploadService.getFileDownloadUrl(filePath);
            }
            res.json({ url });
        }
        catch (error) {
            console.error('Error getting file URL:', error);
            if (error instanceof errorHandler_1.AppError) {
                res.status(error.statusCode).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to get file URL' });
            }
        }
    }
    static async uploadNewVersion(req, res) {
        var _a;
        try {
            const { id } = req.params;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            const file = req.file;
            const { note } = req.body;
            // console.log(req.body);
            //console.log(req.file);
            //console.log(req.user);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            if (!file) {
                return res.status(400).json({ error: 'File is required' });
            }
            const uploadResult = await upload_service_1.UploadService.uploadFile(file);
            const version = await record_service_1.RecordService.createNewVersion(id, Object.assign(Object.assign({}, uploadResult), { uploadedBy: userId, note: note || undefined }));
            res.status(201).json(version);
        }
        catch (error) {
            console.error('Error uploading new version:', error);
            if (error instanceof errorHandler_1.AppError) {
                res.status(error.statusCode).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to upload new version' });
            }
        }
    }
    static async getVersions(req, res) {
        try {
            const { id } = req.params;
            const versions = await record_service_1.RecordService.getRecordVersions(id);
            res.json(versions);
        }
        catch (error) {
            console.error('Error getting versions:', error);
            if (error instanceof errorHandler_1.AppError) {
                res.status(error.statusCode).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to get versions' });
            }
        }
    }
    static async deleteVersion(req, res) {
        var _a;
        try {
            const { id, versionId } = req.params;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            await record_service_1.RecordService.deleteVersion(id, versionId, userId);
            res.json({ message: 'Version deleted successfully' });
        }
        catch (error) {
            console.error('Error deleting version:', error);
            if (error instanceof errorHandler_1.AppError) {
                res.status(error.statusCode).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to delete version' });
            }
        }
    }
    static async updateRecord(req, res) {
        var _a;
        try {
            const { id } = req.params;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            const files = req.files;
            const { customFields, title, note, comments, status } = req.body;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            console.log('gelen id:', id);
            console.log('req.body:', req.body);
            const existingRecord = await record_service_1.RecordService.getRecordById(id);
            if (!existingRecord) {
                return res.status(404).json({ error: 'Record not found' });
            }
            // Parse customFields if it's a string
            let parsedCustomFields = typeof customFields === 'string' ? JSON.parse(customFields) : customFields;
            // Initialize structuredCustomFields
            const structuredCustomFields = {};
            // Only process customFields if they exist
            if (parsedCustomFields) {
                Object.entries(parsedCustomFields).forEach(([fieldId, fieldValue]) => {
                    var _a;
                    structuredCustomFields[fieldId] = {
                        fieldId: Number(fieldId),
                        value: fieldValue,
                        type: ((_a = existingRecord.customFields[fieldId]) === null || _a === void 0 ? void 0 : _a.type) || 'Text/Number with Special Symbols'
                    };
                });
                // Merge with existing custom fields
                parsedCustomFields = Object.assign(Object.assign({}, existingRecord.customFields), structuredCustomFields);
            }
            else {
                // If no new customFields provided, use existing ones
                parsedCustomFields = existingRecord.customFields;
            }
            //console.log('Structured Custom Fields:', JSON.stringify(parsedCustomFields, null, 2));
            // Handle file uploads if any
            if (files && files.length > 0) {
                const fileFields = Array.isArray(req.body.fileFields)
                    ? req.body.fileFields
                    : [req.body.fileFields];
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const fieldId = fileFields[i];
                    // Process the file and get file info
                    const fileInfo = await upload_service_1.UploadService.uploadFile(file);
                    // Update the corresponding field with file information
                    if (parsedCustomFields[fieldId]) {
                        parsedCustomFields[fieldId] = Object.assign(Object.assign({}, parsedCustomFields[fieldId]), { value: {
                                fileName: file.originalname,
                                fileSize: file.size,
                                fileType: file.mimetype,
                                filePath: fileInfo.filePath,
                                fileHash: fileInfo.fileHash
                            } });
                    }
                }
            }
            // Find the first attachment field if any (for main record file info)
            let fileInfo = null;
            for (const fieldId in parsedCustomFields) {
                const field = parsedCustomFields[fieldId];
                if (field.type === 'Attachment' && field.value) {
                    fileInfo = field.value;
                    break;
                }
            }
            const record = await record_service_1.RecordService.updateRecord(id, Object.assign({ title, customFields: parsedCustomFields, note,
                comments, lastModifiedBy: userId, status: status || existingRecord.status }, (fileInfo && {
                fileName: fileInfo.fileName,
                filePath: fileInfo.filePath,
                fileSize: fileInfo.fileSize,
                fileType: fileInfo.fileType,
                fileHash: fileInfo.fileHash,
            })), userId);
            res.json(record);
        }
        catch (error) {
            console.error('Error updating record:', error);
            if (error instanceof errorHandler_1.AppError && error.name === 'NotFoundError') {
                res.status(404).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to update record' });
            }
        }
    }
    static async modifyRecord(req, res) {
        var _a;
        try {
            const recordId = req.params.id;
            const creatorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!creatorId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            // FormData-dan gələn JSON sətirlərini parse edirik, boş stringləri yoxlayaraq default dəyər təyin edirik
            const title = req.body.title;
            const cabinetId = req.body.cabinetId;
            const status = req.body.status;
            const tags = typeof req.body.tags === 'string'
                ? req.body.tags.trim().length > 0
                    ? JSON.parse(req.body.tags)
                    : []
                : req.body.tags || [];
            const customFields = typeof req.body.customFields === 'string'
                ? req.body.customFields.trim().length > 0
                    ? JSON.parse(req.body.customFields)
                    : {}
                : req.body.customFields || {};
            // Faylları işləyirik
            const files = req.files;
            const processedCustomFields = Object.assign({}, customFields);
            let pdfFile;
            if (files && Array.isArray(files)) {
                for (const file of files) {
                    const fieldId = file.fieldname;
                    if (fieldId === 'pdfFile' && file.mimetype === 'application/pdf') {
                        pdfFile = file;
                        continue;
                    }
                    if (file) {
                        // Fayl yüklənməsi üçün UploadService istifadə olunur
                        const uploadResult = await upload_service_1.UploadService.uploadFile(file);
                        processedCustomFields[fieldId] = {
                            fileName: uploadResult.fileName,
                            fileSize: uploadResult.fileSize,
                            fileType: uploadResult.fileType,
                            filePath: uploadResult.filePath,
                            fileHash: uploadResult.fileHash,
                            pageCount: uploadResult.pageCount,
                        };
                    }
                }
            }
            // Service funksiyasını çağıraraq, yeni versiyanı yaradırıq
            const modifiedRecord = await record_service_1.RecordService.modifyRecord({
                recordId,
                title,
                cabinetId,
                creatorId,
                customFields: processedCustomFields,
                status,
                tags,
                pdfFile,
            });
            res.status(200).json(modifiedRecord);
        }
        catch (error) {
            console.error('Error modifying record:', error);
            if (error instanceof errorHandler_1.AppError) {
                res.status(error.statusCode).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to modify record' });
            }
        }
    }
    // Approve Record
    static async approveRecord(req, res) {
        var _a;
        try {
            const { id } = req.params;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            const files = req.files;
            const title = req.body.title;
            const note = req.body.note;
            const comments = req.body.comments;
            // JSON parse: formData-dan gələn customFields
            const customFields = JSON.parse(req.body.customFields || '{}');
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            // Mövcud recordu əldə edirik
            const existingRecord = await record_service_1.RecordService.getRecordById(id);
            if (!existingRecord) {
                return res.status(404).json({ error: 'Record not found' });
            }
            // Fayl yükləmələrini emal edərək customFields obyektini yeniləyirik
            const processedCustomFields = Object.assign({}, customFields);
            if (files && Array.isArray(files)) {
                for (const file of files) {
                    const fieldId = file.fieldname; // FormData-da field name olaraq custom field id təyin olunmalıdır
                    const uploadResult = await upload_service_1.UploadService.uploadFile(file);
                    processedCustomFields[fieldId] = {
                        fileName: uploadResult.fileName,
                        fileSize: uploadResult.fileSize,
                        fileType: uploadResult.fileType,
                        filePath: uploadResult.filePath,
                        fileHash: uploadResult.fileHash,
                        pageCount: uploadResult.pageCount
                    };
                }
            }
            // Kabinetin konfiqurasiyasını əldə edib, customFields-i validasiya edirik
            const cabinet = await cabinet_model_1.Cabinet.findByPk(existingRecord.cabinetId);
            if (!cabinet) {
                return res.status(400).json({ error: 'Cabinet not found' });
            }
            const validatedFields = await record_service_1.RecordService.validateCustomFields(processedCustomFields, cabinet.customFields);
            // Əgər varsa, ilk attachment sahəsinin file məlumatlarını tapırıq
            let fileInfo = null;
            for (const fieldId in validatedFields) {
                const field = validatedFields[fieldId];
                if (field.type === 'Attachment' && field.value) {
                    fileInfo = field.value;
                    break;
                }
            }
            // Update ediləcək məlumatlar
            const updateData = Object.assign({ title, customFields: validatedFields }, (fileInfo && {
                fileName: fileInfo.fileName,
                filePath: fileInfo.filePath,
                fileSize: fileInfo.fileSize,
                fileType: fileInfo.fileType,
                fileHash: fileInfo.fileHash,
            }));
            // Service qatında approve əməliyyatını çağırırıq
            const record = await record_service_1.RecordService.approveRecord(id, userId, note, updateData);
            res.json(record);
        }
        catch (error) {
            console.error('Error approving record:', error);
            if (error instanceof errorHandler_1.AppError) {
                res.status(error.statusCode).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to approve record' });
            }
        }
    }
    // Reject Record
    static async rejectRecord(req, res) {
        var _a;
        try {
            const { id } = req.params;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            const files = req.files;
            const title = req.body.title;
            const note = req.body.note;
            const comments = req.body.comments;
            // JSON parse: formData-dan gələn customFields
            const customFields = JSON.parse(req.body.customFields || '{}');
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            // Mövcud recordu əldə edirik
            const existingRecord = await record_service_1.RecordService.getRecordById(id);
            if (!existingRecord) {
                return res.status(404).json({ error: 'Record not found' });
            }
            // Fayl yükləmələrini emal edərək customFields obyektini yeniləyirik
            const processedCustomFields = Object.assign({}, customFields);
            if (files && Array.isArray(files)) {
                for (const file of files) {
                    const fieldId = file.fieldname;
                    const uploadResult = await upload_service_1.UploadService.uploadFile(file);
                    processedCustomFields[fieldId] = {
                        fileName: uploadResult.fileName,
                        fileSize: uploadResult.fileSize,
                        fileType: uploadResult.fileType,
                        filePath: uploadResult.filePath,
                        fileHash: uploadResult.fileHash,
                        pageCount: uploadResult.pageCount
                    };
                }
            }
            // Kabinetin konfiqurasiyasını əldə edib, customFields-i validasiya edirik
            const cabinet = await cabinet_model_1.Cabinet.findByPk(existingRecord.cabinetId);
            if (!cabinet) {
                return res.status(400).json({ error: 'Cabinet not found' });
            }
            const validatedFields = await record_service_1.RecordService.validateCustomFields(processedCustomFields, cabinet.customFields);
            // Update ediləcək məlumatlar
            const updateData = {
                title,
                customFields: validatedFields,
            };
            // Service qatında reject əməliyyatını çağırırıq
            const record = await record_service_1.RecordService.rejectRecord(id, userId, note, comments, updateData);
            res.json(record);
        }
        catch (error) {
            console.error('Error rejecting record:', error);
            if (error instanceof errorHandler_1.AppError) {
                res.status(error.statusCode).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to reject record' });
            }
        }
    }
    static async reassignRecord(req, res, next) {
    }
    static async getMyRecordsByStatus(req, res) {
        var _a;
        try {
            const { status } = req.query;
            const creatorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!status) {
                return res.status(400).json({ error: 'Status is required' });
            }
            if (!creatorId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            // Handle comma-separated status values and ensure they're strings
            const statusValues = (typeof status === 'string' ? status.split(',') : [status.toString()])
                .map(s => s.trim())
                .filter(s => s.length > 0);
            // Validate status values
            const validStatuses = Object.values(record_model_1.RecordStatus);
            const invalidStatuses = statusValues.filter(s => !validStatuses.includes(s));
            if (invalidStatuses.length > 0) {
                return res.status(400).json({ error: `Invalid status values: ${invalidStatuses.join(', ')}` });
            }
            // Get records created by the current user with the specified status
            const records = await record_service_1.RecordService.getMyRecordsByStatus(statusValues, creatorId);
            res.json(records);
        }
        catch (error) {
            console.error('Error getting my records by status:', error);
            if (error instanceof errorHandler_1.AppError) {
                res.status(error.statusCode).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to get my records' });
            }
        }
    }
    static async getRecordsWaitingForMyApproval(req, res) {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            console.log('User ID:', userId);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            // Get records waiting for this user's approval
            const records = await record_service_1.RecordService.getRecordsWaitingForMyApproval(userId);
            res.json(records);
        }
        catch (error) {
            console.error('Error getting records waiting for approval:', error);
            if (error instanceof errorHandler_1.AppError) {
                res.status(error.statusCode).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to get records waiting for approval' });
            }
        }
    }
    /**
     * Create a record with files from the request
     */
    static async createRecordWithFiles(req, res) {
        var _a;
        try {
            const creatorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            // Parse body
            const { title, cabinetId, status, isTemplate, isActive, tags, customFields, fileIds } = req.body;
            if (!creatorId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            if (!title) {
                return res.status(400).json({ error: 'Title is required' });
            }
            if (!cabinetId) {
                return res.status(400).json({ error: 'Cabinet ID is required' });
            }
            // Parse JSON values if they're strings
            const parsedTags = typeof tags === 'string' ? JSON.parse(tags) : (tags || []);
            const parsedCustomFields = typeof customFields === 'string' ? JSON.parse(customFields) : (customFields || {});
            const parsedFileIds = typeof fileIds === 'string' ? JSON.parse(fileIds) : (fileIds || []);
            // Create record with associated files
            const record = await record_service_1.RecordService.createRecordWithFiles({
                title,
                cabinetId,
                creatorId,
                customFields: parsedCustomFields,
                status: status || record_model_1.RecordStatus.DRAFT,
                isTemplate: isTemplate === 'true' || isTemplate === true,
                isActive: isActive === 'true' || isActive === true || isActive === undefined,
                tags: parsedTags,
                fileIds: parsedFileIds
            });
            res.status(201).json(record);
        }
        catch (error) {
            console.error('Error creating record with files:', error);
            if (error instanceof errorHandler_1.AppError) {
                res.status(error.statusCode).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to create record' });
            }
        }
    }
}
exports.RecordController = RecordController;
// Utility function to calculate string similarity for field matching
function calculateStringSimilarity(str1, str2) {
    // Check for exact match
    if (str1 === str2)
        return 1.0;
    // Check if one string contains the other
    if (str1.includes(str2) || str2.includes(str1)) {
        return 0.8;
    }
    // Check for word overlap
    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);
    let matches = 0;
    for (const word1 of words1) {
        if (word1.length < 3)
            continue; // Skip short words
        for (const word2 of words2) {
            if (word2.length < 3)
                continue; // Skip short words
            if (word1 === word2 || word1.includes(word2) || word2.includes(word1)) {
                matches++;
                break;
            }
        }
    }
    return matches / Math.max(words1.length, words2.length);
}
