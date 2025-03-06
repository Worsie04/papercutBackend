import express from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = express.Router();

// Apply authentication to all notification routes
router.use(authenticate('user'));

// Get all notifications for the current user
router.get('/', NotificationController.getNotifications);

// Get unread notification count for the current user
router.get('/unread/count', NotificationController.getUnreadCount);

// Mark a notification as read
router.put('/:id/read', NotificationController.markAsRead);

// Mark all notifications as read
router.put('/read/all', NotificationController.markAllAsRead);

// Delete a notification
router.delete('/:id', NotificationController.deleteNotification);

export default router;