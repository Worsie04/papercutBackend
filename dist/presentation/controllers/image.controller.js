"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageController = void 0;
const image_service_1 = require("../../services/image.service");
const errorHandler_1 = require("../middlewares/errorHandler");
const http_status_codes_1 = require("http-status-codes");
class ImageController {
    static async getUserImages(req, res, next) {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return next(new errorHandler_1.AppError(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'Authentication required.'));
            }
            const images = await image_service_1.imageService.listUserImages(userId);
            res.status(http_status_codes_1.StatusCodes.OK).json(images);
        }
        catch (error) {
            next(error);
        }
    }
    static async uploadNewImage(req, res, next) {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return next(new errorHandler_1.AppError(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'Authentication required.'));
            }
            if (!req.file) {
                return next(new errorHandler_1.AppError(http_status_codes_1.StatusCodes.BAD_REQUEST, 'No image file uploaded.'));
            }
            const newImage = await image_service_1.imageService.uploadImage(userId, req.file);
            res.status(http_status_codes_1.StatusCodes.CREATED).json({
                url: newImage.publicUrl // CKEditor expects 'url'
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async deleteUserImage(req, res, next) {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            const imageId = req.params.imageId; // Route parametrindən
            if (!userId) {
                return next(new errorHandler_1.AppError(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'Authentication required.'));
            }
            if (!imageId) {
                return next(new errorHandler_1.AppError(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Image ID is required.'));
            }
            await image_service_1.imageService.deleteImage(userId, imageId);
            res.status(http_status_codes_1.StatusCodes.NO_CONTENT).send();
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ImageController = ImageController;
