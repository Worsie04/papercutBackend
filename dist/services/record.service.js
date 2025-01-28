"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecordService = void 0;
const record_model_1 = require("../models/record.model");
const user_model_1 = require("../models/user.model");
const cabinet_model_1 = require("../models/cabinet.model");
const errorHandler_1 = require("../presentation/middlewares/errorHandler");
const sequelize_1 = require("sequelize");
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
        // Create record with validated fields
        const record = await record_model_1.Record.create(Object.assign(Object.assign({}, data), { title: data.title.trim(), customFields: validatedFields, lastModifiedBy: data.creatorId, version: 1 }));
        return record;
    }
    static async validateCustomFields(submittedFields, cabinetFields) {
        const validatedFields = {};
        for (const field of cabinetFields) {
            const submittedValue = submittedFields[field.id];
            // Check if mandatory field is missing
            if (field.isMandatory && (submittedValue === undefined || submittedValue === null || submittedValue === '')) {
                throw new errorHandler_1.AppError(400, `Field '${field.name}' is mandatory`);
            }
            // Validate field value based on type
            const validatedValue = await RecordService.validateFieldValue(submittedValue, field);
            // Store validated value
            if (submittedValue !== undefined) {
                validatedFields[field.id] = {
                    fieldId: field.id,
                    value: validatedValue,
                    type: field.type
                };
            }
        }
        return validatedFields;
    }
    static async validateFieldValue(value, field) {
        if (value === undefined || value === null) {
            return null;
        }
        switch (field.type) {
            case 'Text/Number with Special Symbols':
            case 'Text Only':
                if (typeof value !== 'string') {
                    throw new errorHandler_1.AppError(400, `Field '${field.name}' must be text`);
                }
                if (field.characterLimit && value.length > field.characterLimit) {
                    throw new errorHandler_1.AppError(400, `Field '${field.name}' exceeds character limit of ${field.characterLimit}`);
                }
                return value;
            case 'Number Only':
                const num = Number(value);
                if (isNaN(num)) {
                    throw new errorHandler_1.AppError(400, `Field '${field.name}' must be a number`);
                }
                return num;
            case 'Currency':
                const amount = Number(value);
                if (isNaN(amount)) {
                    throw new errorHandler_1.AppError(400, `Field '${field.name}' must be a valid currency amount`);
                }
                return amount;
            case 'Date':
            case 'Time':
            case 'Time and Date':
                const date = new Date(value);
                if (isNaN(date.getTime())) {
                    throw new errorHandler_1.AppError(400, `Field '${field.name}' must be a valid date/time`);
                }
                return date.toISOString();
            case 'Yes/No':
                if (typeof value !== 'boolean') {
                    throw new errorHandler_1.AppError(400, `Field '${field.name}' must be a boolean`);
                }
                return value;
            case 'Tags/Labels':
                if (!Array.isArray(value)) {
                    throw new errorHandler_1.AppError(400, `Field '${field.name}' must be an array of tags`);
                }
                return value;
            default:
                return value;
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
                }
            ]
        });
        if (!record) {
            throw new errorHandler_1.AppError(400, 'Record not found');
        }
        return record;
    }
    static async updateRecord(id, data, userId) {
        const record = await record_model_1.Record.findByPk(id);
        if (!record) {
            throw new errorHandler_1.AppError(400, 'Record not found');
        }
        // Update record
        await record.update(Object.assign(Object.assign({}, data), { lastModifiedBy: userId }));
        return record;
    }
    static async deleteRecord(id) {
        const record = await record_model_1.Record.findByPk(id);
        if (!record) {
            throw new errorHandler_1.AppError(400, 'Record not found');
        }
        await record.destroy();
        return true;
    }
    static async getRecordsByStatus(status, creatorId) {
        const whereClause = {
            status: Array.isArray(status) ? { [sequelize_1.Op.in]: status } : status
        };
        if (creatorId) {
            whereClause.creatorId = creatorId;
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
}
exports.RecordService = RecordService;
