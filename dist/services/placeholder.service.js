"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.placeholderService = exports.PlaceholderService = void 0;
// placeholder.service.ts
const user_placeholder_model_1 = require("../models/user-placeholder.model");
const errorHandler_1 = require("../presentation/middlewares/errorHandler");
const http_status_codes_1 = require("http-status-codes");
class PlaceholderService {
    async getAllForUser(userId) {
        try {
            const placeholders = await user_placeholder_model_1.UserPlaceholder.findAll({
                where: { userId },
                order: [['name', 'ASC']],
            });
            return placeholders.map((ph) => ({
                id: ph.id,
                name: ph.name,
                orgName: ph.orgName,
                type: ph.type,
                initialValue: ph.initialValue,
                placeholder: ph.placeholder, // Computed dynamically
            }));
        }
        catch (error) {
            throw new errorHandler_1.AppError(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR, 'Placeholders could not be retrieved.');
        }
    }
    async create(userId, data) {
        const { name, orgName, type, initialValue } = data;
        if (!name || !type) {
            throw new errorHandler_1.AppError(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Name and type are required.');
        }
        try {
            const newPlaceholder = await user_placeholder_model_1.UserPlaceholder.create({
                userId,
                name,
                orgName,
                type,
                initialValue,
            });
            return {
                id: newPlaceholder.id,
                name: newPlaceholder.name,
                orgName: newPlaceholder.orgName,
                type: newPlaceholder.type,
                initialValue: newPlaceholder.initialValue,
                placeholder: newPlaceholder.placeholder,
            };
        }
        catch (error) {
            if (error.name === 'SequelizeUniqueConstraintError') {
                throw new errorHandler_1.AppError(http_status_codes_1.StatusCodes.CONFLICT, `Placeholder "${name}" already exists.`);
            }
            throw new errorHandler_1.AppError(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR, 'Placeholder could not be created.');
        }
    }
    async deleteById(userId, placeholderId) {
        if (!placeholderId) {
            throw new errorHandler_1.AppError(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Placeholder ID is required.');
        }
        try {
            const result = await user_placeholder_model_1.UserPlaceholder.destroy({
                where: { id: placeholderId, userId },
            });
            if (result === 0) {
                throw new errorHandler_1.AppError(http_status_codes_1.StatusCodes.NOT_FOUND, 'Placeholder not found or access denied.');
            }
            return true;
        }
        catch (error) {
            if (error instanceof errorHandler_1.AppError)
                throw error;
            throw new errorHandler_1.AppError(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR, 'Placeholder could not be deleted.');
        }
    }
    async updateById(userId, placeholderId, data) {
        const { name, type, initialValue } = data;
        if (!placeholderId) {
            throw new errorHandler_1.AppError(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Placeholder ID is required.');
        }
        if (name === undefined && type === undefined && initialValue === undefined) {
            throw new errorHandler_1.AppError(http_status_codes_1.StatusCodes.BAD_REQUEST, 'At least one field must be provided.');
        }
        try {
            const placeholder = await user_placeholder_model_1.UserPlaceholder.findOne({
                where: { id: placeholderId, userId },
            });
            if (!placeholder) {
                throw new errorHandler_1.AppError(http_status_codes_1.StatusCodes.NOT_FOUND, 'Placeholder not found or access denied.');
            }
            if (name !== undefined)
                placeholder.name = name;
            if (type !== undefined)
                placeholder.type = type;
            if (initialValue !== undefined)
                placeholder.initialValue = initialValue;
            await placeholder.save();
            return {
                id: placeholder.id,
                name: placeholder.name,
                type: placeholder.type,
                initialValue: placeholder.initialValue,
                placeholder: placeholder.placeholder,
            };
        }
        catch (error) {
            if (error.name === 'SequelizeUniqueConstraintError') {
                throw new errorHandler_1.AppError(http_status_codes_1.StatusCodes.CONFLICT, `Placeholder "${name}" already exists.`);
            }
            throw new errorHandler_1.AppError(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR, 'Placeholder could not be updated.');
        }
    }
    async checkAndFindPlaceholder(placeholderName) {
        try {
            const placeholder = await user_placeholder_model_1.UserPlaceholder.findOne({
                where: {
                    name: placeholderName
                },
            });
            if (!placeholder) {
                return null;
            }
            return {
                id: placeholder.id,
                name: placeholder.name,
                orgName: placeholder.orgName,
                type: placeholder.type,
                initialValue: placeholder.initialValue,
                placeholder: placeholder.placeholder, // Computed dynamically
            };
        }
        catch (error) {
            throw new errorHandler_1.AppError(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR, 'Placeholder could not be retrieved.');
        }
    }
}
exports.PlaceholderService = PlaceholderService;
exports.placeholderService = new PlaceholderService();
