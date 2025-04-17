import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../presentation/middlewares/errorHandler';
import { Space, User, SpaceCommentReject } from '../models';
import { Transaction } from 'sequelize';

interface CreateCommentParams {
  spaceId: string;
  userId: string;
  message: string;
  type: 'comment' | 'rejection' | 'approval' | 'update' | 'system';
  transaction?: Transaction;
}

interface SpaceComment {
  id: string;
  spaceId: string;
  userId: string;
  message: string;
  type: string;
  createdAt: Date;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  };
}

// Define a type for the result of findAll with includes
interface CommentWithUser {
  id: string;
  spaceId: string;
  userId: string;
  message: string;
  type: string;
  createdAt: Date;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  };
}

export class SpaceCommentService {
  /**
   * Create a new comment for a space
   */
  static async createComment(data: CreateCommentParams): Promise<SpaceComment> {
    try {
      // Check if space exists
      const space = await Space.findByPk(data.spaceId, {
        transaction: data.transaction
      });

      if (!space) {
        throw new AppError(404, 'Space not found');
      }

      // Check if user exists
      const user = await User.findByPk(data.userId, {
        transaction: data.transaction
      });

      if (!user) {
        throw new AppError(404, 'User not found');
      }

      // Insert the comment
      const comment = await SpaceCommentReject.create({
        id: uuidv4(),
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
    } catch (error) {
      console.error('Error creating comment:', error);
      throw error;
    }
  }

  /**
   * Get all comments for a space
   */
  static async getCommentsBySpaceId(spaceId: string): Promise<SpaceComment[]> {
    try {
      // Check if space exists
      const space = await Space.findByPk(spaceId);

      if (!space) {
        throw new AppError(404, 'Space not found');
      }

      // Get comments with user information
      const comments = await SpaceCommentReject.findAll({
        where: { spaceId },
        include: [{
          model: User,
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatar'],
          as: 'user'
        }],
        order: [['createdAt', 'ASC']]
      });

      // Format the results - use type assertion for the raw result
      return comments.map((comment) => {
        const rawComment = comment.toJSON() as unknown as CommentWithUser;
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
    } catch (error) {
      console.error('Error getting comments:', error);
      throw error;
    }
  }

  /**
   * Delete a comment
   */
  static async deleteComment(commentId: string, userId: string): Promise<void> {
    try {
      // Check if comment exists and belongs to the user
      const comment = await SpaceCommentReject.findOne({
        where: { id: commentId, userId }
      });

      if (!comment) {
        throw new AppError(404, 'Comment not found or you do not have permission to delete it');
      }

      // Delete the comment
      await comment.destroy();
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  }
} 