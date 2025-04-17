"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const notification_controller_1 = require("../controllers/notification.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = express_1.default.Router();
// Apply authentication to all notification routes
router.use((0, auth_middleware_1.authenticate)('user'));
// Get all notifications for the current user
router.get('/', notification_controller_1.NotificationController.getNotifications);
// Get unread notification count for the current user
router.get('/unread/count', notification_controller_1.NotificationController.getUnreadCount);
// Mark a notification as read
router.put('/:id/read', notification_controller_1.NotificationController.markAsRead);
// Mark all notifications as read
router.put('/read/all', notification_controller_1.NotificationController.markAllAsRead);
// Delete a notification
router.delete('/:id', notification_controller_1.NotificationController.deleteNotification);
exports.default = router;
