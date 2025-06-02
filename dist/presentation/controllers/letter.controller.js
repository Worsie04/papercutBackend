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
            const { templateId, formData, name, comment } = req.body;
            if (!templateId || !formData) {
                return next(new errorHandler_1.AppError(400, 'Missing required fields: templateId and formData.'));
            }
            const { logoUrl, signatureUrl, stampUrl } = formData, coreFormData = __rest(formData, ["logoUrl", "signatureUrl", "stampUrl"]);
            const newLetter = await letter_service_1.LetterService.create({
                templateId, userId, formData: coreFormData, name,
                logoUrl: logoUrl !== null && logoUrl !== void 0 ? logoUrl : null, signatureUrl: signatureUrl !== null && signatureUrl !== void 0 ? signatureUrl : null, stampUrl: stampUrl !== null && stampUrl !== void 0 ? stampUrl : null,
                comment: comment === null || comment === void 0 ? void 0 : comment.trim()
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
                return next(new errorHandler_1.AppError(401, 'Authentication required.'));
            }
            if (!letterId) {
                return next(new errorHandler_1.AppError(400, 'Letter ID parameter is required.'));
            }
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
                return next(new errorHandler_1.AppError(400, 'Letter ID parameter is required.'));
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
            const { originalFileId, placements, name, reviewers, approver, comment } = req.body;
            if (!originalFileId || !placements || !Array.isArray(placements) || placements.length === 0 || !reviewers || !Array.isArray(reviewers) || reviewers.length === 0) {
                return next(new errorHandler_1.AppError(400, 'Missing required fields: originalFileId, placements array, and a non-empty reviewers array.'));
            }
            for (const p of placements) {
                if (!p.type || !p.url || p.pageNumber == null || p.x == null || p.y == null || p.width == null || p.height == null) {
                    return next(new errorHandler_1.AppError(400, 'Invalid placement object structure.'));
                }
            }
            // Reject payloads containing QR code placements
            if (placements.some(p => p.type === 'qrcode')) {
                return next(new errorHandler_1.AppError(400, 'QR code placements are not allowed in interactive PDF creation.'));
            }
            if (!reviewers.every(id => typeof id === 'string')) {
                return next(new errorHandler_1.AppError(400, 'Invalid reviewers format. Expecting an array of strings (User IDs).'));
            }
            if (approver && typeof approver !== 'string') {
                return next(new errorHandler_1.AppError(400, 'Invalid approver format. Expecting a string (User ID) or null.'));
            }
            const newSignedLetter = await letter_service_1.LetterService.createFromPdfInteractive({
                originalFileId, placements, userId, reviewers,
                approver: approver !== null && approver !== void 0 ? approver : null,
                name: name !== null && name !== void 0 ? name : `Signed Document ${new Date().toISOString().split('T')[0]}`,
                comment: comment === null || comment === void 0 ? void 0 : comment.trim() // ADDED: pass the comment to the service
            });
            res.status(201).json(newSignedLetter);
        }
        catch (error) {
            console.error('Error in createFromPdfInteractive controller:', error);
            next(error);
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
            const viewUrl = await letter_service_1.LetterService.generateSignedPdfViewUrl(letterId, userId);
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
    static async getLettersPendingMyAction(req, res, next) {
        var _a;
        try {
            const authenticatedReq = req; //
            const userId = (_a = authenticatedReq.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return next(new errorHandler_1.AppError(401, 'Authentication required.'));
            }
            const letters = await letter_service_1.LetterService.getLettersPendingMyAction(userId);
            res.status(200).json(letters);
        }
        catch (error) {
            console.error('Error in getLettersPendingMyAction controller:', error);
            next(error);
        }
    }
    static async approveLetterReview(req, res, next) {
        var _a;
        try {
            const authenticatedReq = req;
            const reviewerUserId = (_a = authenticatedReq.user) === null || _a === void 0 ? void 0 : _a.id;
            const letterId = req.params.id;
            const { comment, name } = req.body;
            if (!reviewerUserId) {
                return next(new errorHandler_1.AppError(401, 'Authentication required.'));
            }
            if (!letterId) {
                return next(new errorHandler_1.AppError(400, 'Letter ID parameter is required.'));
            }
            if (comment && typeof comment !== 'string') {
                return next(new errorHandler_1.AppError(400, 'Invalid comment format.'));
            }
            // --- TODO: Change this to call the new approveStep service method ---
            const updatedLetter = await letter_service_1.LetterService.approveStep(letterId, reviewerUserId, comment, name);
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
            const updatedLetter = await letter_service_1.LetterService.rejectStep(letterId, reviewerUserId, reason);
            res.status(200).json({ message: 'Letter review rejected successfully.', letter: updatedLetter });
        }
        catch (error) {
            next(error);
        }
    }
    // --- NEW CONTROLLER METHODS ---
    static async reassignLetterReview(req, res, next) {
        var _a;
        try {
            const authenticatedReq = req;
            const currentUserId = (_a = authenticatedReq.user) === null || _a === void 0 ? void 0 : _a.id;
            const letterId = req.params.id;
            const { newUserId, reason } = req.body;
            if (!currentUserId) {
                return next(new errorHandler_1.AppError(401, 'Authentication required.'));
            }
            if (!letterId) {
                return next(new errorHandler_1.AppError(400, 'Letter ID parameter is required.'));
            }
            if (!newUserId || typeof newUserId !== 'string') {
                return next(new errorHandler_1.AppError(400, 'New User ID is required for reassignment.'));
            }
            if (reason && typeof reason !== 'string') {
                return next(new errorHandler_1.AppError(400, 'Invalid reason format.'));
            }
            res.status(501).json({ message: 'Reassign service method not yet implemented.' });
        }
        catch (error) {
            next(error);
        }
    }
    static async finalApproveLetter(req, res, next) {
        var _a;
        try {
            const authenticatedReq = req; //
            const userId = (_a = authenticatedReq.user) === null || _a === void 0 ? void 0 : _a.id;
            const letterId = req.params.id;
            const { comment, placements } = req.body;
            if (!userId) {
                return next(new errorHandler_1.AppError(401, 'Authentication required.'));
            }
            if (!letterId) {
                return next(new errorHandler_1.AppError(400, 'Letter ID parameter is required.'));
            }
            for (const p of placements) {
                if (!p.type || !p.url || p.pageNumber == null || p.x == null || p.y == null || p.width == null || p.height == null) {
                    return next(new errorHandler_1.AppError(400, 'Invalid placement object structure.'));
                }
            }
            // Call the service method
            const approvedLetter = await letter_service_1.LetterService.finalApproveLetter(letterId, userId, placements, comment);
            res.status(200).json({ message: 'Letter finally approved successfully.', letter: approvedLetter });
        }
        catch (error) {
            console.error(`Error in finalApproveLetter controller for letter ${req.params.id}:`, error);
            next(error);
        }
    }
    static async finalApproveLetterSingle(req, res, next) {
        var _a;
        try {
            const authenticatedReq = req;
            const userId = (_a = authenticatedReq.user) === null || _a === void 0 ? void 0 : _a.id;
            const letterId = req.params.id;
            const { comment, placements, name } = req.body;
            if (!userId)
                return next(new errorHandler_1.AppError(401, 'Authentication required.'));
            if (!letterId)
                return next(new errorHandler_1.AppError(400, 'Letter ID parameter is required.'));
            if (!placements || !Array.isArray(placements)) {
                return next(new errorHandler_1.AppError(400, 'Placements array is required for final approval'));
            }
            const validatedPlacements = placements.map(p => (Object.assign(Object.assign({}, p), { x: typeof p.x === 'number' ? p.x : 0, y: typeof p.y === 'number' ? p.y : 0, width: p.type === 'qrcode' ? 50 : (typeof p.width === 'number' ? p.width : 50), height: p.type === 'qrcode' ? 50 : (typeof p.height === 'number' ? p.height : 50), pageNumber: typeof p.pageNumber === 'number' ? p.pageNumber : 1 })));
            const approvedLetter = await letter_service_1.LetterService.finalApproveLetterSingle(letterId, userId, validatedPlacements, comment, name);
            res.status(200).json({ message: 'Letter finally approved successfully.', letter: approvedLetter });
        }
        catch (error) {
            console.error(`[Controller] Error in finalApproveLetterSingle for letter ${req.params.id}:`, error);
            next(error);
        }
    }
    static async finalRejectLetter(req, res, next) {
        var _a;
        try {
            const authenticatedReq = req;
            const userId = (_a = authenticatedReq.user) === null || _a === void 0 ? void 0 : _a.id; // This should be the final approver
            const letterId = req.params.id;
            const { reason } = req.body;
            if (!userId) {
                return next(new errorHandler_1.AppError(401, 'Authentication required.'));
            }
            if (!letterId) {
                return next(new errorHandler_1.AppError(400, 'Letter ID parameter is required.'));
            }
            if (!reason || typeof reason !== 'string') {
                return next(new errorHandler_1.AppError(400, 'Rejection reason is required.'));
            }
            const rejectedLetter = await letter_service_1.LetterService.finalReject(letterId, userId, reason);
            res.status(200).json({ message: 'Letter finally rejected successfully.', letter: rejectedLetter });
            // Placeholder response
            res.status(501).json({ message: 'Final reject service method not yet implemented.' });
        }
        catch (error) {
            next(error);
        }
    }
    static async resubmitRejectedLetter(req, res, next) {
        var _a;
        try {
            const authenticatedReq = req;
            const userId = (_a = authenticatedReq.user) === null || _a === void 0 ? void 0 : _a.id; // This should be the original submitter
            const letterId = req.params.id;
            // --- Use the defined interface for the body ---
            const { newSignedFileId, comment } = req.body;
            if (!userId) {
                return next(new errorHandler_1.AppError(401, 'Authentication required.'));
            }
            if (!letterId) {
                return next(new errorHandler_1.AppError(400, 'Letter ID parameter is required.'));
            }
            if (!comment || typeof comment !== 'string') {
                return next(new errorHandler_1.AppError(400, 'Resubmission comment is required.'));
            }
            if (newSignedFileId && typeof newSignedFileId !== 'string') {
                return next(new errorHandler_1.AppError(400, 'Invalid newSignedFileId format.'));
            }
            // --- Call the actual service method ---
            const resubmittedLetter = await letter_service_1.LetterService.resubmitRejectedLetter(letterId, userId, newSignedFileId, comment);
            res.status(200).json({ message: 'Letter resubmitted successfully.', letter: resubmittedLetter });
        }
        catch (error) {
            console.error(`Error in resubmitRejectedLetter controller for letter ${req.params.id}:`, error);
            next(error);
        }
    }
    static async getMyRejectedLetters(req, res, next) {
        var _a;
        try {
            const authenticatedReq = req;
            const userId = (_a = authenticatedReq.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return next(new errorHandler_1.AppError(401, 'Authentication required.'));
            }
            const letters = await letter_service_1.LetterService.getMyRejectedLetters(userId);
            res.status(200).json(letters);
        }
        catch (error) {
            next(error);
        }
    }
    static async getDeletedLetters(req, res, next) {
        var _a;
        try {
            const authenticatedReq = req;
            const userId = (_a = authenticatedReq.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return next(new errorHandler_1.AppError(401, 'Authentication required.'));
            }
            const letters = await letter_service_1.LetterService.getDeletedLetters(userId);
            res.status(200).json(letters);
        }
        catch (error) {
            next(error);
        }
    }
    static async restoreLetter(req, res, next) {
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
            const restoredLetter = await letter_service_1.LetterService.restoreLetter(letterId, userId);
            res.status(200).json(restoredLetter);
        }
        catch (error) {
            next(error);
        }
    }
    static async permanentlyDeleteLetter(req, res, next) {
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
            await letter_service_1.LetterService.permanentlyDeleteLetter(letterId, userId);
            res.status(204).send();
        }
        catch (error) {
            next(error);
        }
    }
}
exports.LetterController = LetterController;
