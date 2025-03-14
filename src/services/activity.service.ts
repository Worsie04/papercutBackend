import { Activity, ActivityType, ResourceType, ActivityStatus } from '../models/activity.model';
import { User } from '../models/user.model';
import { OrganizationMember } from '../models/organization-member.model';
import { AppError } from '../presentation/middlewares/errorHandler';
import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

export interface ActivityParams {
  userId: string;
  action: ActivityType;
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
  details?: string;
}

export class ActivityService {
  /**
   * Log a new activity
   */
  static async logActivity(params: ActivityParams): Promise<Activity> {
    try {
      const { userId, action, resourceType, resourceId, resourceName, details } = params;

      // Validate user exists
      const user = await User.findByPk(userId);
      if (!user) {
        throw new AppError(400, 'User not found');
      }

      // Determine status based on action
      let status: ActivityStatus;
      switch (action) {
        case ActivityType.CREATE:
        case ActivityType.UPDATE:
        case ActivityType.APPROVE:
          status = ActivityStatus.COMPLETED;
          break;
        case ActivityType.SUBMIT:
        case ActivityType.RESUBMIT:
        case ActivityType.REASSIGN:
          status = ActivityStatus.PENDING;
          break;
        case ActivityType.REJECT:
        case ActivityType.DELETE:
          status = ActivityStatus.REJECTED;
          break;
        default:
          status = ActivityStatus.DEFAULT;
      }

      // Create activity record
      const activity = await Activity.create({
        id: uuidv4(),
        userId,
        action,
        resourceType,
        resourceId,
        resourceName,
        details: details || '',
        status,
        timestamp: new Date()
      });

      return activity;
    } catch (error) {
      console.error('Error logging activity:', error);
      throw error;
    }
  }

  /**
   * Log space creation activity
   */
  static async logSpaceCreation(userId: string, spaceId: string, spaceName: string): Promise<Activity> {
    return this.logActivity({
      userId,
      action: ActivityType.CREATE,
      resourceType: ResourceType.SPACE,
      resourceId: spaceId,
      resourceName: spaceName,
      details: 'Space was created',
    });
  }

  /**
   * Log space approval activity
   */
  static async logSpaceApproval(userId: string, spaceId: string, spaceName: string): Promise<Activity> {
    return this.logActivity({
      userId,
      action: ActivityType.APPROVE,
      resourceType: ResourceType.SPACE,
      resourceId: spaceId,
      resourceName: spaceName,
      details: 'Space was approved',
    });
  }

  /**
   * Log space rejection activity
   */
  static async logSpaceRejection(userId: string, spaceId: string, spaceName: string, reason: string): Promise<Activity> {
    return this.logActivity({
      userId,
      action: ActivityType.REJECT,
      resourceType: ResourceType.SPACE,
      resourceId: spaceId,
      resourceName: spaceName,
      details: `Space was rejected. Reason: ${reason}`,
    });
  }

  /**
   * Log space reassignment activity
   */
  static async logSpaceReassignment(userId: string, spaceId: string, spaceName: string, toUserId: string): Promise<Activity> {
    return this.logActivity({
      userId,
      action: ActivityType.REASSIGN,
      resourceType: ResourceType.SPACE,
      resourceId: spaceId,
      resourceName: spaceName,
      details: `Space approval was reassigned to another user`,
    });
  }

  /**
   * Log space deletion activity
   */
  static async logSpaceDeletion(userId: string, spaceId: string, spaceName: string): Promise<Activity> {
    return this.logActivity({
      userId,
      action: ActivityType.DELETE,
      resourceType: ResourceType.SPACE,
      resourceId: spaceId,
      resourceName: spaceName,
      details: 'Space was deleted',
    });
  }

  /**
   * Log cabinet creation activity
   */
  static async logCabinetCreation(userId: string, cabinetId: string, cabinetName: string, spaceId: string, spaceName: string): Promise<Activity> {
    return this.logActivity({
      userId,
      action: ActivityType.CREATE,
      resourceType: ResourceType.CABINET,
      resourceId: cabinetId,
      resourceName: cabinetName,
      details: `Cabinet created in space ${spaceName}`
    });
  }

  /**
   * Log cabinet approval activity
   */
  static async logCabinetApproval(userId: string, cabinetId: string, cabinetName: string): Promise<Activity> {
    return this.logActivity({
      userId,
      action: ActivityType.APPROVE,
      resourceType: ResourceType.CABINET,
      resourceId: cabinetId,
      resourceName: cabinetName,
      details: 'Cabinet was approved',
    });
  }

  /**
   * Log cabinet rejection activity
   */
  static async logCabinetRejection(userId: string, cabinetId: string, cabinetName: string, reason: string): Promise<Activity> {
    return this.logActivity({
      userId,
      action: ActivityType.REJECT,
      resourceType: ResourceType.CABINET,
      resourceId: cabinetId,
      resourceName: cabinetName,
      details: `Cabinet was rejected. Reason: ${reason}`,
    });
  }

  /**
   * Log cabinet deletion activity
   */
  static async logCabinetDeletion(userId: string, cabinetId: string, cabinetName: string): Promise<Activity> {
    return this.logActivity({
      userId,
      action: ActivityType.DELETE,
      resourceType: ResourceType.CABINET,
      resourceId: cabinetId,
      resourceName: cabinetName,
      details: 'Cabinet was deleted',
    });
  }

  /**
   * Log cabinet assignment activity
   */
  static async logCabinetAssignment(userId: string, cabinetId: string, cabinetName: string, assignedUserId: string): Promise<Activity> {
    return this.logActivity({
      userId,
      action: ActivityType.REASSIGN,
      resourceType: ResourceType.CABINET,
      resourceId: cabinetId,
      resourceName: cabinetName,
      details: `User ${assignedUserId} assigned to cabinet`
    });
  }

  /**
   * Log cabinet permission update activity
   */
  static async logCabinetPermissionUpdate(userId: string, cabinetId: string, cabinetName: string, role: string): Promise<Activity> {
    return this.logActivity({
      userId,
      action: ActivityType.UPDATE_PERMISSIONS,
      resourceType: ResourceType.CABINET,
      resourceId: cabinetId,
      resourceName: cabinetName,
      details: `Cabinet permissions updated to role: ${role}`
    });
  }

  /**
   * Log record creation activity
   */
  static async logRecordCreation(userId: string, recordId: string, recordName: string, cabinetId: string, cabinetName: string): Promise<Activity> {
    return this.logActivity({
      userId,
      action: ActivityType.CREATE,
      resourceType: ResourceType.RECORD,
      resourceId: recordId,
      resourceName: recordName,
      details: `Record created in cabinet ${cabinetName}`
    });
  }

  /**
   * Log record approval activity
   */
  static async logRecordApproval(userId: string, recordId: string, recordName: string): Promise<Activity> {
    return this.logActivity({
      userId,
      action: ActivityType.APPROVE,
      resourceType: ResourceType.RECORD,
      resourceId: recordId,
      resourceName: recordName,
      details: 'Record was approved',
    });
  }

  /**
   * Log record rejection activity
   */
  static async logRecordRejection(userId: string, recordId: string, recordName: string, reason: string): Promise<Activity> {
    return this.logActivity({
      userId,
      action: ActivityType.REJECT,
      resourceType: ResourceType.RECORD,
      resourceId: recordId,
      resourceName: recordName,
      details: `Record was rejected. Reason: ${reason}`,
    });
  }

  /**
   * Log record update activity
   */
  static async logRecordUpdate(userId: string, recordId: string, recordName: string): Promise<Activity> {
    return this.logActivity({
      userId,
      action: ActivityType.UPDATE,
      resourceType: ResourceType.RECORD,
      resourceId: recordId,
      resourceName: recordName,
      details: 'Record updated'
    });
  }

  /**
   * Log record deletion activity
   */
  static async logRecordDeletion(userId: string, recordId: string, recordName: string): Promise<Activity> {
    return this.logActivity({
      userId,
      action: ActivityType.DELETE,
      resourceType: ResourceType.RECORD,
      resourceId: recordId,
      resourceName: recordName,
      details: 'Record was deleted',
    });
  }

  /**
   * Get activities for a specific resource
   */
  static async getResourceActivities(
    resourceType: ResourceType,
    resourceId: string,
    filter?: string,
    dateRange?: { from: Date; to: Date }
  ): Promise<Activity[]> {
    try {
      const whereClause: any = {
        resourceType,
        resourceId,
      };

      // Apply type filter if provided
      if (filter && filter !== 'all') {
        whereClause.action = filter;
      }

      // Apply date range if provided
      if (dateRange) {
        whereClause.timestamp = {
          [Op.between]: [dateRange.from, dateRange.to],
        };
      }

      const activities = await Activity.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email', 'avatar'],
          },
        ],
        order: [['timestamp', 'DESC']],
      });

      return activities;
    } catch (error) {
      console.error('Error fetching resource activities:', error);
      throw error;
    }
  }

  /**
   * Get recent activities across all resources for a user
   */
  static async getRecentActivities(
    userId?: string,
    limit: number = 20
  ): Promise<Activity[]> {
    try {
      const whereClause: any = {};

      // Filter by user if provided
      if (userId) {
        whereClause.userId = userId;
      }

      const activities = await Activity.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email', 'avatar'],
          },
        ],
        order: [['timestamp', 'DESC']],
        limit,
      });
      console.log('activities', activities);

      return activities;
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      throw error;
    }
  }

  static async getOrganizationActivities(
    organizationId: string,
    limit: number = 50
  ): Promise<Activity[]> {
    try {
      // Get all user IDs belonging to this organization
      const organizationMembers = await OrganizationMember.findAll({
        where: {
          organizationId,
          status: 'active'
        },
        attributes: ['userId']
      });
      
      const userIds = organizationMembers.map(member => member.userId);
      
      // No members found - return empty array
      if (userIds.length === 0) {
        return [];
      }
      
      // Find activities for users in this organization
      const activities = await Activity.findAll({
        where: {
          userId: {
            [Op.in]: userIds
          }
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
          },
        ],
        order: [['createdAt', 'DESC']],
        limit
      });

      return activities;
    } catch (error) {
      console.error('Error fetching organization activities:', error);
      throw error;
    }
  }
}