"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LetterCommentController = void 0;
const letterComment_service_1 = require("../../services/letterComment.service");
const errorHandler_1 = require("../middlewares/errorHandler");
class LetterCommentController {
    /**
     * Adds a comment to a letter.
     */
    static async addComment(req, res, next) {
        var _a;
        try {
            const authenticatedReq = req;
            const userId = (_a = authenticatedReq.user) === null || _a === void 0 ? void 0 : _a.id; // Get user from authenticated request
            const letterId = req.params.id; // Get letter ID from URL parameter
            const { message, type } = req.body;
            if (!userId) {
                return next(new errorHandler_1.AppError(401, 'Authentication required.'));
            }
            if (!letterId) {
                return next(new errorHandler_1.AppError(400, 'Letter ID parameter is required.'));
            }
            if (!message || typeof message !== 'string' || message.trim() === '') {
                return next(new errorHandler_1.AppError(400, 'Comment message cannot be empty.'));
            }
            // Default type to 'comment' if not provided or invalid
            const commentType = (type && ['comment', 'rejection', 'approval', 'system', 'update'].includes(type)) ? type : 'comment';
            const commentData = {
                letterId,
                userId,
                message: message.trim(),
                type: commentType,
            };
            const newComment = await letterComment_service_1.LetterCommentService.createComment(commentData);
            res.status(201).json(newComment);
        }
        catch (error) {
            next(error); // Pass errors to the global error handler
        }
    }
    /**
     * Gets all comments for a specific letter.
     */
    static async getLetterComments(req, res, next) {
        var _a;
        try {
            // Authentication might still be needed to view comments
            const authenticatedReq = req;
            if (!((_a = authenticatedReq.user) === null || _a === void 0 ? void 0 : _a.id)) {
                return next(new errorHandler_1.AppError(401, 'Authentication required.'));
            }
            const letterId = req.params.id;
            if (!letterId) {
                return next(new errorHandler_1.AppError(400, 'Letter ID parameter is required.'));
            }
            // TODO: Add authorization check - should the user be allowed to see comments?
            // Maybe check if user is creator, reviewer, or approver using LetterService.findById logic?
            // For now, assuming any authenticated user who can view the letter can view comments.
            const comments = await letterComment_service_1.LetterCommentService.getCommentsByLetterId(letterId);
            res.status(200).json(comments);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.LetterCommentController = LetterCommentController;
