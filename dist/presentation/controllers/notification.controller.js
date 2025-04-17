"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
const notification_service_1 = require("../../services/notification.service");
class NotificationController {
    static async getNotifications(req, res, next) {
        try {
            const userId = req.user.id;
            const notifications = await notification_service_1.NotificationService.getNotificationsForUser(userId);
            res.json(notifications);
        }
        catch (error) {
            next(error);
        }
    }
    static async markAsRead(req, res, next) {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            await notification_service_1.NotificationService.markAsRead(id, userId);
            res.json({ success: true });
        }
        catch (error) {
            next(error);
        }
    }
    static async markAllAsRead(req, res, next) {
        try {
            const userId = req.user.id;
            const count = await notification_service_1.NotificationService.markAllAsRead(userId);
            res.json({ success: true, count });
        }
        catch (error) {
            next(error);
        }
    }
    static async deleteNotification(req, res, next) {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            await notification_service_1.NotificationService.deleteNotification(id, userId);
            res.json({ success: true });
        }
        catch (error) {
            next(error);
        }
    }
    static async getUnreadCount(req, res, next) {
        try {
            const userId = req.user.id;
            const count = await notification_service_1.NotificationService.countUnreadNotifications(userId);
            res.json({ count });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.NotificationController = NotificationController;
