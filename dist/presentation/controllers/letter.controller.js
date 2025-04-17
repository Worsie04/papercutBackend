"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LetterController = void 0;
const letter_service_1 = require("../../services/letter.service");
const errorHandler_1 = require("../middlewares/errorHandler");
class LetterController {
    static async create(req, res, next) {
        var _a;
        try {
            const authenticatedReq = req;
            const userId = (_a = authenticatedReq.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return next(new errorHandler_1.AppError(401, 'Authentication required.'));
            }
            const { templateId, formData, name } = req.body;
            if (!templateId || !formData) {
                return next(new errorHandler_1.AppError(401, 'Missing required fields: templateId and formData.'));
            }
            const { logoUrl, signatureUrl, stampUrl } = formData, coreFormData = __rest(formData, ["logoUrl", "signatureUrl", "stampUrl"]);
            const newLetter = await letter_service_1.LetterService.create({
                templateId,
                userId,
                formData: coreFormData, // Pass only the core data
                name,
                logoUrl: logoUrl !== null && logoUrl !== void 0 ? logoUrl : null, // Pass URLs separately
                signatureUrl: signatureUrl !== null && signatureUrl !== void 0 ? signatureUrl : null,
                stampUrl: stampUrl !== null && stampUrl !== void 0 ? stampUrl : null,
            });
            res.status(201).json(newLetter);
        }
        catch (error) {
            next(error);
        }
    }
    static async getAllByUserId(req, res, next) {
        var _a;
        try {
            const authenticatedReq = req;
            const userId = (_a = authenticatedReq.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return next(new errorHandler_1.AppError(401, 'Authentication required.'));
            }
            const letters = await letter_service_1.LetterService.getAllByUserId(userId);
            res.status(200).json(letters);
        }
        catch (error) {
            next(error);
        }
    }
    static async getById(req, res, next) {
        var _a;
        try {
            const authenticatedReq = req;
            const userId = (_a = authenticatedReq.user) === null || _a === void 0 ? void 0 : _a.id;
            const letterId = req.params.id;
            if (!userId) {
                console.log('User ID not found in request.');
                return next(new errorHandler_1.AppError(401, 'Authentication required.'));
            }
            if (!letterId) {
                console.log('Letter ID parameter is missing.');
                return next(new errorHandler_1.AppError(400, 'Letter ID parameter is required.'));
            }
            // Now userId and letterId are guaranteed to be strings
            const letter = await letter_service_1.LetterService.findById(letterId, userId);
            res.status(200).json(letter);
        }
        catch (error) {
            if (error instanceof errorHandler_1.AppError) {
                res.status(error.statusCode || 500).json({ error: error.message });
            }
            else {
                next(error);
            }
        }
    }
    static async delete(req, res, next) {
        var _a;
        try {
            const authenticatedReq = req;
            const userId = (_a = authenticatedReq.user) === null || _a === void 0 ? void 0 : _a.id;
            const letterId = req.params.id;
            if (!userId) {
                return next(new errorHandler_1.AppError(401, 'Authentication required.'));
            }
            if (!letterId) {
                return next(new errorHandler_1.AppError(401, 'Letter ID parameter is required.'));
            }
            await letter_service_1.LetterService.delete(letterId, userId);
            res.status(204).send();
        }
        catch (error) {
            if (error instanceof errorHandler_1.AppError) {
                res.status(error.statusCode || 500).json({ error: error.message });
            }
            else {
                next(error);
            }
        }
    }
    static async createFromPdfInteractive(req, res, next) {
        var _a;
        try {
            const authenticatedReq = req;
            const userId = (_a = authenticatedReq.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return next(new errorHandler_1.AppError(401, 'Authentication required.'));
            }
            const { originalFileId, placements, name } = req.body;
            if (!originalFileId || !placements || !Array.isArray(placements) || placements.length === 0) {
                return next(new errorHandler_1.AppError(400, 'Missing required fields: originalFileId and a non-empty placements array.'));
            }
            // Basic validation for placements (can be expanded)
            for (const p of placements) {
                if (!p.type || !p.url || p.pageNumber == null || p.x == null || p.y == null || p.width == null || p.height == null) {
                    return next(new errorHandler_1.AppError(400, 'Invalid placement object structure.'));
                }
            }
            console.log(`Controller: Received request to create letter from PDF ${originalFileId} for user ${userId}`);
            // Call the new service method
            const newSignedLetter = await letter_service_1.LetterService.createFromPdfInteractive({
                originalFileId,
                placements,
                userId,
                name: name !== null && name !== void 0 ? name : `Signed Document ${new Date().toISOString()}` // Provide a default name
            });
            // Respond with the newly created letter details (especially the signedPdfUrl)
            res.status(201).json(newSignedLetter);
        }
        catch (error) {
            console.error('Error in createFromPdfInteractive controller:', error);
            next(error); // Pass error to the error handling middleware
        }
    }
    static async getSignedPdfViewUrl(req, res, next) {
        var _a;
        try {
            const authenticatedReq = req;
            const userId = (_a = authenticatedReq.user) === null || _a === void 0 ? void 0 : _a.id;
            const letterId = req.params.id;
            if (!userId) {
                return next(new errorHandler_1.AppError(401, 'Authentication required.'));
            }
            if (!letterId) {
                return next(new errorHandler_1.AppError(400, 'Letter ID parameter is required.'));
            }
            console.log(`Controller: Requesting view URL for letter ${letterId} by user ${userId}`);
            // Call the new service method
            const viewUrl = await letter_service_1.LetterService.generateSignedPdfViewUrl(letterId, userId);
            // Respond with the generated URL
            res.status(200).json({ viewUrl });
        }
        catch (error) {
            console.error(`Error in getSignedPdfViewUrl controller for letter ${req.params.id}:`, error);
            if (error instanceof errorHandler_1.AppError) {
                throw new errorHandler_1.AppError(500, 'Error in getSignedPdfViewUrl controller for letter');
            }
            next(error);
        }
    }
    static async getPendingReviewLetters(req, res, next) {
        var _a;
        try {
            const authenticatedReq = req;
            const userId = (_a = authenticatedReq.user) === null || _a === void 0 ? void 0 : _a.id;
            console.log('Approver"s Authenticated user ID:', userId);
            if (!userId) {
                return next(new errorHandler_1.AppError(401, 'Authentication required.'));
            }
            const letters = await letter_service_1.LetterService.getLettersPendingReview(userId);
            res.status(200).json(letters);
        }
        catch (error) {
            next(error);
        }
    }
    static async approveLetterReview(req, res, next) {
        var _a;
        try {
            const authenticatedReq = req;
            const reviewerUserId = (_a = authenticatedReq.user) === null || _a === void 0 ? void 0 : _a.id;
            const letterId = req.params.id;
            const { comment } = req.body; // Optional comment from request body
            if (!reviewerUserId) {
                return next(new errorHandler_1.AppError(401, 'Authentication required.'));
            }
            if (!letterId) {
                return next(new errorHandler_1.AppError(400, 'Letter ID parameter is required.'));
            }
            if (comment && typeof comment !== 'string') {
                return next(new errorHandler_1.AppError(400, 'Invalid comment format.'));
            }
            const updatedLetter = await letter_service_1.LetterService.approveReview(letterId, reviewerUserId, comment);
            res.status(200).json({ message: 'Letter review approved successfully.', letter: updatedLetter });
        }
        catch (error) {
            next(error);
        }
    }
    static async rejectLetterReview(req, res, next) {
        var _a;
        try {
            const authenticatedReq = req;
            const reviewerUserId = (_a = authenticatedReq.user) === null || _a === void 0 ? void 0 : _a.id;
            const letterId = req.params.id;
            const { reason } = req.body;
            if (!reviewerUserId) {
                return next(new errorHandler_1.AppError(401, 'Authentication required.'));
            }
            if (!letterId) {
                return next(new errorHandler_1.AppError(400, 'Letter ID parameter is required.'));
            }
            if (reason && typeof reason !== 'string') {
                return next(new errorHandler_1.AppError(400, 'Invalid rejection reason format.'));
            }
            const updatedLetter = await letter_service_1.LetterService.rejectReview(letterId, reviewerUserId, reason);
            res.status(200).json({ message: 'Letter review rejected successfully.', letter: updatedLetter });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.LetterController = LetterController;
