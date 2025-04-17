// src/services/letterComment.service.ts
import { LetterComment, LetterCommentCreationAttributes, LetterCommentType } from '../models/letterComment.model';
import { User } from '../models/user.model'; // To include user details
import { AppError } from '../presentation/middlewares/errorHandler';

interface CreateCommentData {
    letterId: string;
    userId: string; // ID of the user creating the comment
    message: string;
    type: LetterCommentType;
}

export class LetterCommentService {

    /**
     * Creates a new comment for a letter.
     */
    static async createComment(data: CreateCommentData): Promise<LetterComment> {
        const { letterId, userId, message, type } = data;

        if (!letterId || !userId || !message || !type) {
            throw new AppError(400, 'Missing required fields for creating a comment.');
        }

        try {
            const newComment = await LetterComment.create({
                letterId,
                userId,
                message,
                type,
            });
            console.log(`Service: Created comment ${newComment.id} for letter ${letterId}`);
            // Refetch to include associations if needed immediately
            // return await this.findById(newComment.id); // Optional: define findById if needed
            return newComment;
        } catch (error) {
            console.error(`Error creating comment for letter ${letterId}:`, error);
            throw new AppError(500, 'Failed to create comment.');
        }
    }

    /**
     * Fetches all comments for a specific letter, ordered by creation date.
     * Includes details of the user who made the comment.
     */
    static async getCommentsByLetterId(letterId: string): Promise<LetterComment[]> {
        if (!letterId) {
            throw new AppError(400, 'Letter ID is required to fetch comments.');
        }

        try {
            const comments = await LetterComment.findAll({
                where: { letterId },
                include: [{
                    model: User,
                    as: 'user', // Use the alias defined in the association
                    attributes: ['id', 'firstName', 'lastName', 'email', 'avatar'] // Select desired user fields
                }],
                order: [['createdAt', 'ASC']], // Show oldest comments first
            });
            console.log(`Service: Found ${comments.length} comments for letter ${letterId}`);
            return comments;
        } catch (error) {
            console.error(`Error fetching comments for letter ${letterId}:`, error);
            throw new AppError(500, 'Failed to fetch comments.');
        }
    }

}