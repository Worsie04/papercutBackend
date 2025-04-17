import { Notification, NotificationCreationAttributes } from '../models/notification.model';
import { User } from '../models/user.model';
import { AppError } from '../presentation/middlewares/errorHandler';
import { Op } from 'sequelize';

export class NotificationService {
  static async createNotification(data: NotificationCreationAttributes): Promise<Notification> {
    try {
      const notification = await Notification.create(data);
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  static async getNotificationsForUser(userId: string): Promise<Notification[]> {
    try {
      const notifications = await Notification.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
          }
        ]
      });
      return notifications;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  static async markAsRead(id: string, userId: string): Promise<boolean> {
    try {
      const notification = await Notification.findByPk(id);
      
      if (!notification) {
        throw new AppError(404, 'Notification not found');
      }
      
      if (notification.userId !== userId) {
        throw new AppError(403, 'Unauthorized access to notification');
      }
      
      await notification.update({ read: true });
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  static async markAllAsRead(userId: string): Promise<number> {
    try {
      const [rowsUpdated] = await Notification.update(
        { read: true },
        { where: { userId, read: false } }
      );
      return rowsUpdated;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  static async deleteNotification(id: string, userId: string): Promise<boolean> {
    try {
      const notification = await Notification.findByPk(id);
      
      if (!notification) {
        throw new AppError(404, 'Notification not found');
      }
      
      if (notification.userId !== userId) {
        throw new AppError(403, 'Unauthorized access to notification');
      }
      
      await notification.destroy();
      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  static async countUnreadNotifications(userId: string): Promise<number> {
    try {
      return await Notification.count({
        where: { userId, read: false }
      });
    } catch (error) {
      console.error('Error counting unread notifications:', error);
      throw error;
    }
  }

  // Space-specific notification methods
  static async createSpaceCreationNotification(
    approverUserId: string,
    spaceId: string,
    spaceName: string,
    creatorName: string
  ): Promise<Notification> {
    return this.createNotification({
      userId: approverUserId,
      title: 'New Space Awaiting Approval',
      message: `${creatorName} has created a new space "${spaceName}" that needs your approval.`,
      type: 'space_creation',
      entityType: 'space',
      entityId: spaceId
    });
  }

  static async createSpaceApprovalNotification(
    creatorUserId: string,
    spaceId: string,
    spaceName: string
  ): Promise<Notification> {
    return this.createNotification({
      userId: creatorUserId,
      title: 'Space Approved',
      message: `Your space "${spaceName}" has been approved!`,
      type: 'space_approval',
      entityType: 'space',
      entityId: spaceId
    });
  }

  static async createSpaceRejectionNotification(
    creatorUserId: string,
    spaceId: string,
    spaceName: string,
    reason: string
  ): Promise<Notification> {
    return this.createNotification({
      userId: creatorUserId,
      title: 'Space Rejected',
      message: `Your space "${spaceName}" was rejected. Reason: ${reason}`,
      type: 'space_rejection',
      entityType: 'space',
      entityId: spaceId
    });
  }

  static async createSpaceReassignmentNotification(
    assigneeUserId: string,
    spaceId: string,
    spaceName: string
  ): Promise<Notification> {
    return this.createNotification({
      userId: assigneeUserId,
      title: 'Space Approval Assigned to You',
      message: `A space "${spaceName}" has been reassigned to you for approval.`,
      type: 'space_reassignment',
      entityType: 'space',
      entityId: spaceId
    });
  }

  static async createSpaceDeletionNotification(
    spaceId: string,
    userId: string,
    spaceName: string,
    deletedById: string
  ): Promise<Notification> {
   
    const deletedByUser = await User.findByPk(deletedById, {
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
  static async createCabinetCreationNotification(
    approverUserId: string,
    cabinetId: string,
    cabinetName: string,
    creatorName: string
  ): Promise<Notification> {
    return this.createNotification({
      userId: approverUserId,
      title: 'New Cabinet Awaiting Approval',
      message: `${creatorName} has created a new cabinet "${cabinetName}" that needs your approval.`,
      type: 'cabinet_creation',
      entityType: 'cabinet',
      entityId: cabinetId
    });
  }

  static async createCabinetResubmittedlNotification(
    creatorUserId: string,
    cabinetId: string,
    cabinetName: string
  ): Promise<Notification> {
    return this.createNotification({
      userId: creatorUserId,
      title: 'Cabinet Resubmitted for Approval',
      message: `Your cabinet "${cabinetName}" has been resubmitted!`,
      type: 'cabinet_resubmitted',
      entityType: 'cabinet',
      entityId: cabinetId
    });
  }


  static async createCabinetApprovalNotification(
    creatorUserId: string,
    cabinetId: string,
    cabinetName: string
  ): Promise<Notification> {
    return this.createNotification({
      userId: creatorUserId,
      title: 'Cabinet Approved',
      message: `Your cabinet "${cabinetName}" has been approved!`,
      type: 'cabinet_approval',
      entityType: 'cabinet',
      entityId: cabinetId
    });
  }

  static async createCabinetRejectionNotification(
    creatorUserId: string,
    cabinetId: string,
    cabinetName: string,
    reason: string
  ): Promise<Notification> {
    return this.createNotification({
      userId: creatorUserId,
      title: 'Cabinet Rejected',
      message: `Your cabinet "${cabinetName}" was rejected. Reason: ${reason}`,
      type: 'cabinet_rejection',
      entityType: 'cabinet',
      entityId: cabinetId
    });
  }

  static async createCabinetReassignmentNotification(
    assigneeUserId: string,
    cabinetId: string,
    cabinetName: string
  ): Promise<Notification> {
    return this.createNotification({
      userId: assigneeUserId,
      title: 'Cabinet Approval Assigned to You',
      message: `A cabinet "${cabinetName}" has been reassigned to you for approval.`,
      type: 'cabinet_reassignment',
      entityType: 'cabinet',
      entityId: cabinetId
    });
  }

  static async createCabinetDeletionNotification(
    cabinetId: string,
    userId: string,
    cabinetName: string,
    deletedById: string
  ): Promise<Notification> {
    const deletedByUser = await User.findByPk(deletedById, {
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

  static async createCabinetAssignmentNotification(
    assignedUserId: string,
    cabinetId: string,
    cabinetName: string,
    assignerName: string
  ): Promise<Notification> {
    return this.createNotification({
      userId: assignedUserId,
      title: 'Added to Cabinet',
      message: `${assignerName} has added you to cabinet "${cabinetName}".`,
      type: 'cabinet_reassignment',
      entityType: 'cabinet',
      entityId: cabinetId
    });
  }

  static async createRecordApprovalNotification(
    creatorUserId: string,
    recordId: string,
    recordTitle: string
  ): Promise<Notification> {
    return this.createNotification({
      userId: creatorUserId,
      title: 'Record Approved',
      message: `Your record "${recordTitle}" has been approved!`,
      type: 'record_approval',
      entityType: 'record',
      entityId: recordId
    });
  }

  static async createRecordRejectionNotification(
    creatorUserId: string,
    recordId: string,
    recordTitle: string,
    reason: string
  ): Promise<Notification> {
    return this.createNotification({
      userId: creatorUserId,
      title: 'Record Rejected',
      message: `Your record "${recordTitle}" was rejected. Reason: ${reason}`,
      type: 'record_rejection',
      entityType: 'record',
      entityId: recordId
    });
  }



  static async createTemplateShareNotification(
    sharedWithUserId: string, // User receiving the notification
    sharedByUserName: string, // Name of the user who shared
    templateId: string,       // ID of the template
    templateName: string    // Name of the template
): Promise<void> { // Return void, handle errors internally for now
    try {
        await this.createNotification({
          userId: sharedWithUserId,
          title: 'Template Shared', // Concise title
          message: `${sharedByUserName} shared the template "${templateName || 'Untitled Template'}" with you.`,
          type: 'template_share', // Specific type for this event
          entityType: 'template',   // The entity type involved
          entityId: templateId,     // The specific entity ID
          // read: false is the default
        });
        console.log(`Template share notification created for user ${sharedWithUserId}`);
    } catch (error) {
        console.error(`Error creating template share notification for user ${sharedWithUserId}:`, error);
    }
  }

  static async createLetterReviewRequestNotification(
    reviewerUserId: string,
    letterId: string,
    letterName: string,
    submitterName: string
  ): Promise<Notification | void> { // Return void or Notification based on error handling preference
    try {
      return await this.createNotification({
        userId: reviewerUserId,
        title: 'Letter Review Request',
        message: `${submitterName} submitted the letter "${letterName || 'Untitled Letter'}" for your review.`,
        type: 'letter_review_request', // Use the new type
        entityType: 'letter',
        entityId: letterId
      });
    } catch (error) {
        console.error(`Error creating letter review request notification for reviewer ${reviewerUserId}, letter ${letterId}:`, error);
        // Decide how to handle: return void, throw, return null?
    }
  }

  static async createLetterReviewApprovedNotification(
    submitterUserId: string,
    letterId: string,
    letterName: string,
    reviewerName?: string
  ): Promise<Notification | void> {
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
    } catch (error) {
        console.error(`Error creating letter review approved notification for submitter ${submitterUserId}, letter ${letterId}:`, error);
    }
  }

  static async createLetterReviewRejectedNotification(
    submitterUserId: string,
    letterId: string,
    letterName: string,
    reason: string,
    reviewerName?: string // Optional: Name of the reviewer
  ): Promise<Notification | void> {
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
    } catch (error) {
         console.error(`Error creating letter review rejected notification for submitter ${submitterUserId}, letter ${letterId}:`, error);
    }
  }

  static async createLetterFinalApprovedNotification(
    submitterUserId: string,
    letterId: string,
    letterName: string,
    approverName?: string // Optional: Name of the final approver
  ): Promise<Notification | void> {
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
    } catch (error) {
         console.error(`Error creating letter final approved notification for submitter ${submitterUserId}, letter ${letterId}:`, error);
    }
  }

  static async createLetterFinalRejectedNotification(
    submitterUserId: string,
    letterId: string,
    letterName: string,
    reason: string,
    approverName?: string // Optional: Name of the final approver
  ): Promise<Notification | void> {
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
    } catch (error) {
         console.error(`Error creating letter final rejected notification for submitter ${submitterUserId}, letter ${letterId}:`, error);
    }
  }







}