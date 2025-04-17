"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpaceCommentService = void 0;
const uuid_1 = require("uuid");
const errorHandler_1 = require("../presentation/middlewares/errorHandler");
const models_1 = require("../models");
class SpaceCommentService {
    /**
     * Create a new comment for a space
     */
    static async createComment(data) {
        try {
            // Check if space exists
            const space = await models_1.Space.findByPk(data.spaceId, {
                transaction: data.transaction
            });
            if (!space) {
                throw new errorHandler_1.AppError(404, 'Space not found');
            }
            // Check if user exists
            const user = await models_1.User.findByPk(data.userId, {
                transaction: data.transaction
            });
            if (!user) {
                throw new errorHandler_1.AppError(404, 'User not found');
            }
            // Insert the comment
            const comment = await models_1.SpaceCommentReject.create({
                id: (0, uuid_1.v4)(),
                spaceId: data.spaceId,
                userId: data.userId,
                message: data.message,
                type: data.type
            }, {
                transaction: data.transaction
            });
            return {
                id: comment.id,
                spaceId: comment.spaceId,
                userId: comment.userId,
                message: comment.message,
                type: comment.type,
                createdAt: comment.createdAt
            };
        }
        catch (error) {
            console.error('Error creating comment:', error);
            throw error;
        }
    }
    /**
     * Get all comments for a space
     */
    static async getCommentsBySpaceId(spaceId) {
        try {
            // Check if space exists
            const space = await models_1.Space.findByPk(spaceId);
            if (!space) {
                throw new errorHandler_1.AppError(404, 'Space not found');
            }
            // Get comments with user information
            const comments = await models_1.SpaceCommentReject.findAll({
                where: { spaceId },
                include: [{
                        model: models_1.User,
                        attributes: ['id', 'firstName', 'lastName', 'email', 'avatar'],
                        as: 'user'
                    }],
                order: [['createdAt', 'ASC']]
            });
            // Format the results - use type assertion for the raw result
            return comments.map((comment) => {
                const rawComment = comment.toJSON();
                return {
                    id: rawComment.id,
                    spaceId: rawComment.spaceId,
                    userId: rawComment.userId,
                    message: rawComment.message,
                    type: rawComment.type,
                    createdAt: rawComment.createdAt,
                    user: rawComment.user ? {
                        id: rawComment.user.id,
                        firstName: rawComment.user.firstName,
                        lastName: rawComment.user.lastName,
                        email: rawComment.user.email,
                        avatar: rawComment.user.avatar
                    } : undefined
                };
            });
        }
        catch (error) {
            console.error('Error getting comments:', error);
            throw error;
        }
    }
    /**
     * Delete a comment
     */
    static async deleteComment(commentId, userId) {
        try {
            // Check if comment exists and belongs to the user
            const comment = await models_1.SpaceCommentReject.findOne({
                where: { id: commentId, userId }
            });
            if (!comment) {
                throw new errorHandler_1.AppError(404, 'Comment not found or you do not have permission to delete it');
            }
            // Delete the comment
            await comment.destroy();
        }
        catch (error) {
            console.error('Error deleting comment:', error);
            throw error;
        }
    }
}
exports.SpaceCommentService = SpaceCommentService;
