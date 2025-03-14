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
}