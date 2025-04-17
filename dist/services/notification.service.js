"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const notification_model_1 = require("../models/notification.model");
const user_model_1 = require("../models/user.model");
const errorHandler_1 = require("../presentation/middlewares/errorHandler");
class NotificationService {
    static async createNotification(data) {
        try {
            const notification = await notification_model_1.Notification.create(data);
            return notification;
        }
        catch (error) {
            console.error('Error creating notification:', error);
            throw error;
        }
    }
    static async getNotificationsForUser(userId) {
        try {
            const notifications = await notification_model_1.Notification.findAll({
                where: { userId },
                order: [['createdAt', 'DESC']],
                include: [
                    {
                        model: user_model_1.User,
                        as: 'user',
                        attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
                    }
                ]
            });
            return notifications;
        }
        catch (error) {
            console.error('Error fetching notifications:', error);
            throw error;
        }
    }
    static async markAsRead(id, userId) {
        try {
            const notification = await notification_model_1.Notification.findByPk(id);
            if (!notification) {
                throw new errorHandler_1.AppError(404, 'Notification not found');
            }
            if (notification.userId !== userId) {
                throw new errorHandler_1.AppError(403, 'Unauthorized access to notification');
            }
            await notification.update({ read: true });
            return true;
        }
        catch (error) {
            console.error('Error marking notification as read:', error);
            throw error;
        }
    }
    static async markAllAsRead(userId) {
        try {
            const [rowsUpdated] = await notification_model_1.Notification.update({ read: true }, { where: { userId, read: false } });
            return rowsUpdated;
        }
        catch (error) {
            console.error('Error marking all notifications as read:', error);
            throw error;
        }
    }
    static async deleteNotification(id, userId) {
        try {
            const notification = await notification_model_1.Notification.findByPk(id);
            if (!notification) {
                throw new errorHandler_1.AppError(404, 'Notification not found');
            }
            if (notification.userId !== userId) {
                throw new errorHandler_1.AppError(403, 'Unauthorized access to notification');
            }
            await notification.destroy();
            return true;
        }
        catch (error) {
            console.error('Error deleting notification:', error);
            throw error;
        }
    }
    static async countUnreadNotifications(userId) {
        try {
            return await notification_model_1.Notification.count({
                where: { userId, read: false }
            });
        }
        catch (error) {
            console.error('Error counting unread notifications:', error);
            throw error;
        }
    }
    // Space-specific notification methods
    static async createSpaceCreationNotification(approverUserId, spaceId, spaceName, creatorName) {
        return this.createNotification({
            userId: approverUserId,
            title: 'New Space Awaiting Approval',
            message: `${creatorName} has created a new space "${spaceName}" that needs your approval.`,
            type: 'space_creation',
            entityType: 'space',
            entityId: spaceId
        });
    }
    static async createSpaceApprovalNotification(creatorUserId, spaceId, spaceName) {
        return this.createNotification({
            userId: creatorUserId,
            title: 'Space Approved',
            message: `Your space "${spaceName}" has been approved!`,
            type: 'space_approval',
            entityType: 'space',
            entityId: spaceId
        });
    }
    static async createSpaceRejectionNotification(creatorUserId, spaceId, spaceName, reason) {
        return this.createNotification({
            userId: creatorUserId,
            title: 'Space Rejected',
            message: `Your space "${spaceName}" was rejected. Reason: ${reason}`,
            type: 'space_rejection',
            entityType: 'space',
            entityId: spaceId
        });
    }
    static async createSpaceReassignmentNotification(assigneeUserId, spaceId, spaceName) {
        return this.createNotification({
            userId: assigneeUserId,
            title: 'Space Approval Assigned to You',
            message: `A space "${spaceName}" has been reassigned to you for approval.`,
            type: 'space_reassignment',
            entityType: 'space',
            entityId: spaceId
        });
    }
    static async createSpaceDeletionNotification(spaceId, userId, spaceName, deletedById) {
        const deletedByUser = await user_model_1.User.findByPk(deletedById, {
            attributes: ['firstName', 'lastName']
        });
        const deletedByName = deletedByUser
            ? `${deletedByUser.firstName} ${deletedByUser.lastName}`
            : 'A user';
        return this.createNotification({
            userId,
            title: 'Space Deleted',
            message: `${deletedByName} has deleted the space "${spaceName}".`,
            type: 'space_deletion',
            entityType: 'space',
            entityId: spaceId
        });
    }
    // Cabinet-specific notification methods
    static async createCabinetCreationNotification(approverUserId, cabinetId, cabinetName, creatorName) {
        return this.createNotification({
            userId: approverUserId,
            title: 'New Cabinet Awaiting Approval',
            message: `${creatorName} has created a new cabinet "${cabinetName}" that needs your approval.`,
            type: 'cabinet_creation',
            entityType: 'cabinet',
            entityId: cabinetId
        });
    }
    static async createCabinetResubmittedlNotification(creatorUserId, cabinetId, cabinetName) {
        return this.createNotification({
            userId: creatorUserId,
            title: 'Cabinet Resubmitted for Approval',
            message: `Your cabinet "${cabinetName}" has been resubmitted!`,
            type: 'cabinet_resubmitted',
            entityType: 'cabinet',
            entityId: cabinetId
        });
    }
    static async createCabinetApprovalNotification(creatorUserId, cabinetId, cabinetName) {
        return this.createNotification({
            userId: creatorUserId,
            title: 'Cabinet Approved',
            message: `Your cabinet "${cabinetName}" has been approved!`,
            type: 'cabinet_approval',
            entityType: 'cabinet',
            entityId: cabinetId
        });
    }
    static async createCabinetRejectionNotification(creatorUserId, cabinetId, cabinetName, reason) {
        return this.createNotification({
            userId: creatorUserId,
            title: 'Cabinet Rejected',
            message: `Your cabinet "${cabinetName}" was rejected. Reason: ${reason}`,
            type: 'cabinet_rejection',
            entityType: 'cabinet',
            entityId: cabinetId
        });
    }
    static async createCabinetReassignmentNotification(assigneeUserId, cabinetId, cabinetName) {
        return this.createNotification({
            userId: assigneeUserId,
            title: 'Cabinet Approval Assigned to You',
            message: `A cabinet "${cabinetName}" has been reassigned to you for approval.`,
            type: 'cabinet_reassignment',
            entityType: 'cabinet',
            entityId: cabinetId
        });
    }
    static async createCabinetDeletionNotification(cabinetId, userId, cabinetName, deletedById) {
        const deletedByUser = await user_model_1.User.findByPk(deletedById, {
            attributes: ['firstName', 'lastName']
        });
        const deletedByName = deletedByUser
            ? `${deletedByUser.firstName} ${deletedByUser.lastName}`
            : 'A user';
        return this.createNotification({
            userId,
            title: 'Cabinet Deleted',
            message: `${deletedByName} has deleted the cabinet "${cabinetName}".`,
            type: 'cabinet_deletion',
            entityType: 'cabinet',
            entityId: cabinetId
        });
    }
    static async createCabinetAssignmentNotification(assignedUserId, cabinetId, cabinetName, assignerName) {
        return this.createNotification({
            userId: assignedUserId,
            title: 'Added to Cabinet',
            message: `${assignerName} has added you to cabinet "${cabinetName}".`,
            type: 'cabinet_reassignment',
            entityType: 'cabinet',
            entityId: cabinetId
        });
    }
    static async createRecordApprovalNotification(creatorUserId, recordId, recordTitle) {
        return this.createNotification({
            userId: creatorUserId,
            title: 'Record Approved',
            message: `Your record "${recordTitle}" has been approved!`,
            type: 'record_approval',
            entityType: 'record',
            entityId: recordId
        });
    }
    static async createRecordRejectionNotification(creatorUserId, recordId, recordTitle, reason) {
        return this.createNotification({
            userId: creatorUserId,
            title: 'Record Rejected',
            message: `Your record "${recordTitle}" was rejected. Reason: ${reason}`,
            type: 'record_rejection',
            entityType: 'record',
            entityId: recordId
        });
    }
    static async createTemplateShareNotification(sharedWithUserId, // User receiving the notification
    sharedByUserName, // Name of the user who shared
    templateId, // ID of the template
    templateName // Name of the template
    ) {
        try {
            await this.createNotification({
                userId: sharedWithUserId,
                title: 'Template Shared', // Concise title
                message: `${sharedByUserName} shared the template "${templateName || 'Untitled Template'}" with you.`,
                type: 'template_share', // Specific type for this event
                entityType: 'template', // The entity type involved
                entityId: templateId, // The specific entity ID
                // read: false is the default
            });
            console.log(`Template share notification created for user ${sharedWithUserId}`);
        }
        catch (error) {
            console.error(`Error creating template share notification for user ${sharedWithUserId}:`, error);
        }
    }
    static async createLetterReviewRequestNotification(reviewerUserId, letterId, letterName, submitterName) {
        try {
            return await this.createNotification({
                userId: reviewerUserId,
                title: 'Letter Review Request',
                message: `${submitterName} submitted the letter "${letterName || 'Untitled Letter'}" for your review.`,
                type: 'letter_review_request', // Use the new type
                entityType: 'letter',
                entityId: letterId
            });
        }
        catch (error) {
            console.error(`Error creating letter review request notification for reviewer ${reviewerUserId}, letter ${letterId}:`, error);
            // Decide how to handle: return void, throw, return null?
        }
    }
    static async createLetterReviewApprovedNotification(submitterUserId, letterId, letterName, reviewerName) {
        const message = reviewerName
            ? `Your letter "${letterName || 'Untitled Letter'}" has been approved by reviewer ${reviewerName}.`
            : `Your letter "${letterName || 'Untitled Letter'}" has passed the review stage.`;
        try {
            return await this.createNotification({
                userId: submitterUserId,
                title: 'Letter Review Approved',
                message: message,
                type: 'letter_review_approved',
                entityType: 'letter',
                entityId: letterId
            });
        }
        catch (error) {
            console.error(`Error creating letter review approved notification for submitter ${submitterUserId}, letter ${letterId}:`, error);
        }
    }
    static async createLetterReviewRejectedNotification(submitterUserId, letterId, letterName, reason, reviewerName // Optional: Name of the reviewer
    ) {
        const message = reviewerName
            ? `Reviewer ${reviewerName} rejected your letter "${letterName || 'Untitled Letter'}". Reason: ${reason || 'No reason provided.'}`
            : `Your letter "${letterName || 'Untitled Letter'}" was rejected during review. Reason: ${reason || 'No reason provided.'}`;
        try {
            return await this.createNotification({
                userId: submitterUserId,
                title: 'Letter Review Rejected',
                message: message,
                type: 'letter_review_rejected',
                entityType: 'letter',
                entityId: letterId
            });
        }
        catch (error) {
            console.error(`Error creating letter review rejected notification for submitter ${submitterUserId}, letter ${letterId}:`, error);
        }
    }
    static async createLetterFinalApprovedNotification(submitterUserId, letterId, letterName, approverName // Optional: Name of the final approver
    ) {
        const message = approverName
            ? `Your letter "${letterName || 'Untitled Letter'}" has been finally approved by ${approverName}!`
            : `Your letter "${letterName || 'Untitled Letter'}" has been finally approved!`;
        try {
            return await this.createNotification({
                userId: submitterUserId,
                title: 'Letter Approved',
                message: message,
                type: 'letter_final_approved',
                entityType: 'letter',
                entityId: letterId
            });
        }
        catch (error) {
            console.error(`Error creating letter final approved notification for submitter ${submitterUserId}, letter ${letterId}:`, error);
        }
    }
    static async createLetterFinalRejectedNotification(submitterUserId, letterId, letterName, reason, approverName // Optional: Name of the final approver
    ) {
        const message = approverName
            ? `Your letter "${letterName || 'Untitled Letter'}" was finally rejected by ${approverName}. Reason: ${reason || 'No reason provided.'}`
            : `Your letter "${letterName || 'Untitled Letter'}" was finally rejected. Reason: ${reason || 'No reason provided.'}`;
        try {
            return await this.createNotification({
                userId: submitterUserId,
                title: 'Letter Rejected',
                message: message,
                type: 'letter_final_rejected',
                entityType: 'letter',
                entityId: letterId
            });
        }
        catch (error) {
            console.error(`Error creating letter final rejected notification for submitter ${submitterUserId}, letter ${letterId}:`, error);
        }
    }
}
exports.NotificationService = NotificationService;
