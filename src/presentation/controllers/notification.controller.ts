import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../../services/notification.service';

// Add this interface for the authenticated request
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    type: string;
    role?: string;
  };
}

export class NotificationController {
  static async getNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const notifications = await NotificationService.getNotificationsForUser(userId);
      res.json(notifications);
    } catch (error) {
      next(error);
    }
  }

  static async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const { id } = req.params;
      await NotificationService.markAsRead(id, userId);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  static async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const count = await NotificationService.markAllAsRead(userId);
      res.json({ success: true, count });
    } catch (error) {
      next(error);
    }
  }

  static async deleteNotification(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const { id } = req.params;
      await NotificationService.deleteNotification(id, userId);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  static async getUnreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const count = await NotificationService.countUnreadNotifications(userId);
      res.json({ count });
    } catch (error) {
      next(error);
    }
  }
}