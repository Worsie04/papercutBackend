"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LetterCommentService = void 0;
// src/services/letterComment.service.ts
const letterComment_model_1 = require("../models/letterComment.model");
const user_model_1 = require("../models/user.model"); // To include user details
const errorHandler_1 = require("../presentation/middlewares/errorHandler");
class LetterCommentService {
    /**
     * Creates a new comment for a letter.
     */
    static async createComment(data) {
        const { letterId, userId, message, type } = data;
        if (!letterId || !userId || !message || !type) {
            throw new errorHandler_1.AppError(400, 'Missing required fields for creating a comment.');
        }
        try {
            const newComment = await letterComment_model_1.LetterComment.create({
                letterId,
                userId,
                message,
                type,
            });
            console.log(`Service: Created comment ${newComment.id} for letter ${letterId}`);
            // Refetch to include associations if needed immediately
            // return await this.findById(newComment.id); // Optional: define findById if needed
            return newComment;
        }
        catch (error) {
            console.error(`Error creating comment for letter ${letterId}:`, error);
            throw new errorHandler_1.AppError(500, 'Failed to create comment.');
        }
    }
    /**
     * Fetches all comments for a specific letter, ordered by creation date.
     * Includes details of the user who made the comment.
     */
    static async getCommentsByLetterId(letterId) {
        if (!letterId) {
            throw new errorHandler_1.AppError(400, 'Letter ID is required to fetch comments.');
        }
        try {
            const comments = await letterComment_model_1.LetterComment.findAll({
                where: { letterId },
                include: [{
                        model: user_model_1.User,
                        as: 'user', // Use the alias defined in the association
                        attributes: ['id', 'firstName', 'lastName', 'email', 'avatar'] // Select desired user fields
                    }],
                order: [['createdAt', 'ASC']], // Show oldest comments first
            });
            console.log(`Service: Found ${comments.length} comments for letter ${letterId}`);
            return comments;
        }
        catch (error) {
            console.error(`Error fetching comments for letter ${letterId}:`, error);
            throw new errorHandler_1.AppError(500, 'Failed to fetch comments.');
        }
    }
}
exports.LetterCommentService = LetterCommentService;
