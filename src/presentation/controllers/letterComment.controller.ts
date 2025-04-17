// src/controllers/letterComment.controller.ts
import { Request, Response, NextFunction } from 'express';
import { LetterCommentService } from '../../services/letterComment.service';
import { AuthenticatedRequest } from '../../types/express'; // Assuming this type exists
import { AppError } from '../middlewares/errorHandler';
import { LetterCommentType } from '../../models/letterComment.model';

export class LetterCommentController {

    /**
     * Adds a comment to a letter.
     */
    static async addComment(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const authenticatedReq = req as AuthenticatedRequest;
            const userId = authenticatedReq.user?.id; // Get user from authenticated request
            const letterId = req.params.id; // Get letter ID from URL parameter
            const { message, type } = req.body as { message: string; type?: LetterCommentType };

            if (!userId) {
                return next(new AppError(401, 'Authentication required.'));
            }
            if (!letterId) {
                 return next(new AppError(400, 'Letter ID parameter is required.'));
            }
            if (!message || typeof message !== 'string' || message.trim() === '') {
                 return next(new AppError(400, 'Comment message cannot be empty.'));
            }

            // Default type to 'comment' if not provided or invalid
            const commentType = (type && ['comment', 'rejection', 'approval', 'system', 'update'].includes(type)) ? type : 'comment';

            const commentData = {
                letterId,
                userId,
                message: message.trim(),
                type: commentType,
            };

            const newComment = await LetterCommentService.createComment(commentData);
            res.status(201).json(newComment);

        } catch (error) {
            next(error); // Pass errors to the global error handler
        }
    }

    /**
     * Gets all comments for a specific letter.
     */
    static async getLetterComments(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // Authentication might still be needed to view comments
            const authenticatedReq = req as AuthenticatedRequest;
            if (!authenticatedReq.user?.id) {
                return next(new AppError(401, 'Authentication required.'));
            }

            const letterId = req.params.id;
            if (!letterId) {
                return next(new AppError(400, 'Letter ID parameter is required.'));
            }

            // TODO: Add authorization check - should the user be allowed to see comments?
            // Maybe check if user is creator, reviewer, or approver using LetterService.findById logic?
            // For now, assuming any authenticated user who can view the letter can view comments.

            const comments = await LetterCommentService.getCommentsByLetterId(letterId);
            res.status(200).json(comments);

        } catch (error) {
            next(error);
        }
    }
}