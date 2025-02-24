"use strict";
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
        // Create record with validated fields and file information
        const record = await record_model_1.Record.create(Object.assign(Object.assign(Object.assign({}, data), { title: data.title.trim(), customFields: validatedFields, lastModifiedBy: data.creatorId, version: 1 }), (fileInfo && {
            fileName: fileInfo.fileName,
            filePath: fileInfo.filePath,
            fileSize: fileInfo.fileSize,
            fileType: fileInfo.fileType,
            fileHash: fileInfo.fileHash,
        })));
        return record;
    }
    static async validateCustomFields(submittedFields, cabinetFields) {
        const validatedFields = {};
        console.log('Submitted Fields:', JSON.stringify(submittedFields, null, 2));
        console.log('Cabinet Fields:', JSON.stringify(cabinetFields, null, 2));
        for (const field of cabinetFields) {
            console.log(`Processing field: ${field.name} (${field.type})`);
            const submittedField = submittedFields[field.id];
            console.log('Submitted field value:', submittedField);
            // Handle mandatory field validation
            if (field.isMandatory) {
                console.log(`Field ${field.name} is mandatory`);
                if (field.type === 'Attachment') {
                    // For attachment fields, check if there's a valid value object
                    const hasValidValue = submittedField &&
                        ((submittedField.value && Object.keys(submittedField.value).length > 0) ||
                            (typeof submittedField === 'object' && (submittedField.filePath || submittedField.fileName)));
                    console.log('Attachment field validation:', {
                        hasValidValue,
                        submittedField: submittedField
                    });
                    if (!hasValidValue) {
                        throw new errorHandler_1.AppError(400, `Field '${field.name}' is mandatory`);
                    }
                }
                else {
                    // For non-attachment fields
                    const hasValue = submittedField !== undefined && submittedField !== null && submittedField !== '';
                    console.log('Non-attachment field validation:', {
                        hasValue,
                        submittedField: submittedField
                    });
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
            console.log(`Validated field ${field.name}:`, validatedFields[field.id]);
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
                            attributes: ['id', 'firstName', 'lastName']
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
    }
    static async updateRecord(id, data, userId) {
        const transaction = await sequelize_2.sequelize.transaction();
        try {
            const record = await record_model_1.Record.findByPk(id);
            if (!record) {
                throw new errorHandler_1.AppError(404, 'Record not found');
            }
            // Update record
            await record.update(Object.assign(Object.assign({}, data), { lastModifiedBy: userId }), { transaction });
            // Add note if provided
            if (data.note) {
                await record_note_comment_model_1.RecordNoteComment.create({
                    recordId: id,
                    content: data.note,
                    type: 'note',
                    action: 'update',
                    createdBy: userId
                }, { transaction });
            }
            // Add comment if provided
            if (data.comments) {
                await record_note_comment_model_1.RecordNoteComment.create({
                    recordId: id,
                    content: data.comments,
                    type: 'comment',
                    createdBy: userId
                }, { transaction });
            }
            await transaction.commit();
            // Fetch updated record with notes and comments
            const updatedRecord = await record_model_1.Record.findByPk(id, {
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
            if (!updatedRecord) {
                throw new errorHandler_1.AppError(404, 'Updated record not found');
            }
            // Process customFields to ensure file information is properly structured
            if (updatedRecord.customFields) {
                for (const fieldId in updatedRecord.customFields) {
                    const field = updatedRecord.customFields[fieldId];
                    if (field.type === 'Attachment' && field.value) {
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
            return updatedRecord;
        }
        catch (error) {
            try {
                // Attempt to rollback the transaction
                await transaction.rollback();
            }
            catch (rollbackError) {
                // If rollback fails, it's likely because the transaction was already committed
                console.error('Rollback failed:', rollbackError);
            }
            throw error;
        }
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
    static async approveRecord(recordId, userId, note, data) {
        const transaction = await sequelize_2.sequelize.transaction();
        try {
            const record = await record_model_1.Record.findByPk(recordId);
            if (!record) {
                throw new errorHandler_1.AppError(404, 'Record not found');
            }
            // Update record status and any additional data
            await record.update(Object.assign(Object.assign({}, data), { status: record_model_1.RecordStatus.APPROVED, lastModifiedBy: userId }), { transaction });
            // Add system note for approval
            await record_note_comment_model_1.RecordNoteComment.create({
                recordId,
                content: note || 'Record approved',
                type: 'system',
                action: 'approve',
                createdBy: userId
            }, { transaction });
            await transaction.commit();
            // Fetch updated record with notes and comments
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
                // Attempt to rollback the transaction
                await transaction.rollback();
            }
            catch (rollbackError) {
                // If rollback fails, it's likely because the transaction was already committed
                console.error('Rollback failed:', rollbackError);
            }
            throw error;
        }
    }
    static async rejectRecord(recordId, userId, note, comments) {
        var _a, _b;
        const transaction = await sequelize_2.sequelize.transaction();
        try {
            // Get the record and validate it exists
            const record = await record_model_1.Record.findByPk(recordId, {
                include: [
                    {
                        model: cabinet_model_1.Cabinet,
                        as: 'cabinet'
                    }
                ],
                transaction
            });
            if (!record || !record.cabinet) {
                throw new errorHandler_1.AppError(404, 'Record or cabinet not found');
            }
            // Get the cabinet with its full data
            const cabinet = await cabinet_model_1.Cabinet.findByPk(record.cabinetId, { transaction });
            if (!cabinet) {
                throw new errorHandler_1.AppError(404, 'Cabinet not found');
            }
            // Check if the user is an approver
            const isApprover = (_b = (_a = cabinet.approvers) === null || _a === void 0 ? void 0 : _a.some(approver => approver.userId === userId)) !== null && _b !== void 0 ? _b : false;
            // If not an explicit approver, check if they are a member_full
            if (!isApprover) {
                const cabinetMember = await cabinet_member_model_1.CabinetMember.findOne({
                    where: {
                        cabinetId: record.cabinetId,
                        userId: userId,
                        role: 'member_full'
                    },
                    transaction
                });
                if (!cabinetMember) {
                    throw new errorHandler_1.AppError(403, 'User is not authorized to reject this record');
                }
            }
            // Check if the record is in a rejectable state
            if (record.status !== record_model_1.RecordStatus.PENDING) {
                throw new errorHandler_1.AppError(400, 'Only pending records can be rejected');
            }
            // Update record status
            await record.update({
                status: record_model_1.RecordStatus.REJECTED,
                lastModifiedBy: userId
            }, { transaction });
            // Add note if provided
            if (note) {
                await record_note_comment_model_1.RecordNoteComment.create({
                    recordId: recordId,
                    content: note,
                    type: 'note',
                    action: 'reject',
                    createdBy: userId
                }, { transaction });
            }
            // Add comment if provided
            if (comments) {
                await record_note_comment_model_1.RecordNoteComment.create({
                    recordId: recordId,
                    content: comments,
                    type: 'comment',
                    action: 'reject',
                    createdBy: userId
                }, { transaction });
            }
            // Return updated record with associations
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
                        include: [
                            {
                                model: user_model_1.User,
                                as: 'creator',
                                attributes: ['id', 'firstName', 'lastName']
                            }
                        ],
                        order: [['createdAt', 'DESC']]
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
                                attributes: ['id', 'firstName', 'lastName']
                            }
                        ],
                        order: [['createdAt', 'DESC']]
                    }
                ],
                transaction
            });
            // If everything is successful, commit the transaction
            await transaction.commit();
            return updatedRecord;
        }
        catch (error) {
            try {
                // Attempt to rollback the transaction
                await transaction.rollback();
            }
            catch (rollbackError) {
                // If rollback fails, it's likely because the transaction was already committed
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
}
exports.RecordService = RecordService;
