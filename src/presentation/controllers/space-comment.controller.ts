import { Request, Response } from 'express';
import { SpaceCommentService } from '../../services/space-comment.service';
import { AppError } from '../middlewares/errorHandler';

export class SpaceCommentController {
  /**
   * Add a comment to a space
   */
  static async addComment(req: Request, res: Response) {
    try {
      const { id } = req.params; // space id
      const { message, type = 'comment' } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      if (!message || !message.trim()) {
        return res.status(400).json({ error: 'Comment message is required' });
      }

      const comment = await SpaceCommentService.createComment({
        spaceId: id,
        userId,
        message,
        type: type as 'comment' | 'rejection' | 'approval' | 'update' | 'system'
      });

      res.status(201).json(comment);
    } catch (error: unknown) {
      console.error('Error adding comment:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to add comment' });
      }
    }
  }

  /**
   * Get all comments for a space
   */
  static async getComments(req: Request, res: Response) {
    try {
      const { id } = req.params; // space id
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const comments = await SpaceCommentService.getCommentsBySpaceId(id);
      res.json(comments);
    } catch (error: unknown) {
      console.error('Error getting comments:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get comments' });
      }
    }
  }

  /**
   * Delete a comment
   */
  static async deleteComment(req: Request, res: Response) {
    try {
      const { commentId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      await SpaceCommentService.deleteComment(commentId, userId);
      res.json({ message: 'Comment deleted successfully' });
    } catch (error: unknown) {
      console.error('Error deleting comment:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to delete comment' });
      }
    }
  }
} 