"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaceholderController = void 0;
const placeholder_service_1 = require("../../services/placeholder.service");
const errorHandler_1 = require("../middlewares/errorHandler");
const http_status_codes_1 = require("http-status-codes");
class PlaceholderController {
    static async getPlaceholders(req, res, next) {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return next(new errorHandler_1.AppError(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'Authentication required.'));
            }
            const placeholders = await placeholder_service_1.placeholderService.getAllForUser(userId);
            res.status(http_status_codes_1.StatusCodes.OK).json(placeholders);
        }
        catch (error) {
            next(error);
        }
    }
    static async createPlaceholder(req, res, next) {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return next(new errorHandler_1.AppError(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'Authentication required.'));
            }
            const { name, type, initialValue } = req.body;
            if (!name || !type) {
                return next(new errorHandler_1.AppError(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Name and type are required.'));
            }
            const newPlaceholder = await placeholder_service_1.placeholderService.create(userId, { name, type, initialValue });
            res.status(http_status_codes_1.StatusCodes.CREATED).json(newPlaceholder);
        }
        catch (error) {
            next(error);
        }
    }
    static async deletePlaceholder(req, res, next) {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            const placeholderId = req.params.id;
            if (!userId) {
                return next(new errorHandler_1.AppError(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'Authentication required.'));
            }
            if (!placeholderId) {
                return next(new errorHandler_1.AppError(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Placeholder ID is required.'));
            }
            await placeholder_service_1.placeholderService.deleteById(userId, placeholderId);
            res.status(http_status_codes_1.StatusCodes.NO_CONTENT).send();
        }
        catch (error) {
            next(error);
        }
    }
    // Optional: Include update if needed
    static async updatePlaceholder(req, res, next) {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            const placeholderId = req.params.id;
            const { name, type, initialValue } = req.body;
            if (!userId) {
                return next(new errorHandler_1.AppError(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'Authentication required.'));
            }
            if (!placeholderId) {
                return next(new errorHandler_1.AppError(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Placeholder ID is required.'));
            }
            const updatedPlaceholder = await placeholder_service_1.placeholderService.updateById(userId, placeholderId, { name, type, initialValue });
            res.status(http_status_codes_1.StatusCodes.OK).json(updatedPlaceholder);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.PlaceholderController = PlaceholderController;
