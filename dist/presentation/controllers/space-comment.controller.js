"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpaceCommentController = void 0;
const space_comment_service_1 = require("../../services/space-comment.service");
const errorHandler_1 = require("../middlewares/errorHandler");
class SpaceCommentController {
    /**
     * Add a comment to a space
     */
    static async addComment(req, res) {
        var _a;
        try {
            const { id } = req.params; // space id
            const { message, type = 'comment' } = req.body;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }
            if (!message || !message.trim()) {
                return res.status(400).json({ error: 'Comment message is required' });
            }
            const comment = await space_comment_service_1.SpaceCommentService.createComment({
                spaceId: id,
                userId,
                message,
                type: type
            });
            res.status(201).json(comment);
        }
        catch (error) {
            console.error('Error adding comment:', error);
            if (error instanceof errorHandler_1.AppError) {
                res.status(error.statusCode).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to add comment' });
            }
        }
    }
    /**
     * Get all comments for a space
     */
    static async getComments(req, res) {
        var _a;
        try {
            const { id } = req.params; // space id
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }
            const comments = await space_comment_service_1.SpaceCommentService.getCommentsBySpaceId(id);
            res.json(comments);
        }
        catch (error) {
            console.error('Error getting comments:', error);
            if (error instanceof errorHandler_1.AppError) {
                res.status(error.statusCode).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get comments' });
            }
        }
    }
    /**
     * Delete a comment
     */
    static async deleteComment(req, res) {
        var _a;
        try {
            const { commentId } = req.params;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }
            await space_comment_service_1.SpaceCommentService.deleteComment(commentId, userId);
            res.json({ message: 'Comment deleted successfully' });
        }
        catch (error) {
            console.error('Error deleting comment:', error);
            if (error instanceof errorHandler_1.AppError) {
                res.status(error.statusCode).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to delete comment' });
            }
        }
    }
}
exports.SpaceCommentController = SpaceCommentController;
