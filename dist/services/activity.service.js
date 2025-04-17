"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityService = void 0;
const activity_model_1 = require("../models/activity.model");
const user_model_1 = require("../models/user.model");
const organization_member_model_1 = require("../models/organization-member.model");
const errorHandler_1 = require("../presentation/middlewares/errorHandler");
const sequelize_1 = require("sequelize");
const uuid_1 = require("uuid");
class ActivityService {
    /**
     * Log a new activity
     */
    static async logActivity(params) {
        try {
            const { userId, action, resourceType, resourceId, resourceName, details, transaction } = params;
            // Validate user exists
            const user = await user_model_1.User.findByPk(userId, { transaction });
            if (!user) {
                throw new errorHandler_1.AppError(400, 'User not found');
            }
            // Determine status based on action
            let status;
            switch (action) {
                case activity_model_1.ActivityType.CREATE:
                case activity_model_1.ActivityType.UPDATE:
                case activity_model_1.ActivityType.APPROVE:
                    status = activity_model_1.ActivityStatus.COMPLETED;
                    break;
                case activity_model_1.ActivityType.SUBMIT:
                case activity_model_1.ActivityType.RESUBMIT:
                    status = activity_model_1.ActivityStatus.PENDING;
                    break;
                case activity_model_1.ActivityType.REASSIGN:
                    status = activity_model_1.ActivityStatus.REASSIGNED;
                    break;
                case activity_model_1.ActivityType.REJECT:
                case activity_model_1.ActivityType.DELETE:
                    status = activity_model_1.ActivityStatus.REJECTED;
                    break;
                default:
                    status = activity_model_1.ActivityStatus.DEFAULT;
            }
            // Create activity record
            const activity = await activity_model_1.Activity.create({
                id: (0, uuid_1.v4)(),
                userId,
                action,
                resourceType,
                resourceId,
                resourceName,
                details: details || '',
                status,
                timestamp: new Date()
            }, { transaction });
            return activity;
        }
        catch (error) {
            console.error('Error logging activity:', error);
            throw error;
        }
    }
    /**
     * Log space creation activity
     */
    static async logSpaceCreation(userId, spaceId, spaceName) {
        return this.logActivity({
            userId,
            action: activity_model_1.ActivityType.CREATE,
            resourceType: activity_model_1.ResourceType.SPACE,
            resourceId: spaceId,
            resourceName: spaceName,
            details: 'Space was created',
        });
    }
    /**
     * Log space approval activity
     */
    static async logSpaceApproval(userId, spaceId, spaceName) {
        return this.logActivity({
            userId,
            action: activity_model_1.ActivityType.APPROVE,
            resourceType: activity_model_1.ResourceType.SPACE,
            resourceId: spaceId,
            resourceName: spaceName,
            details: 'Space was approved',
        });
    }
    /**
     * Log space rejection activity
     */
    static async logSpaceRejection(userId, spaceId, spaceName, reason) {
        return this.logActivity({
            userId,
            action: activity_model_1.ActivityType.REJECT,
            resourceType: activity_model_1.ResourceType.SPACE,
            resourceId: spaceId,
            resourceName: spaceName,
            details: `Space was rejected. Reason: ${reason}`,
        });
    }
    /**
     * Log space reassignment activity
     */
    static async logSpaceReassignment(userId, spaceId, spaceName, toUserId) {
        return this.logActivity({
            userId,
            action: activity_model_1.ActivityType.REASSIGN,
            resourceType: activity_model_1.ResourceType.SPACE,
            resourceId: spaceId,
            resourceName: spaceName,
            details: `Space approval was reassigned to another user`,
        });
    }
    /**
     * Log space deletion activity
     */
    static async logSpaceDeletion(userId, spaceId, spaceName) {
        return this.logActivity({
            userId,
            action: activity_model_1.ActivityType.DELETE,
            resourceType: activity_model_1.ResourceType.SPACE,
            resourceId: spaceId,
            resourceName: spaceName,
            details: 'Space was deleted',
        });
    }
    /**
     * Log cabinet creation activity
     */
    static async logCabinetCreation(userId, cabinetId, cabinetName, spaceId, spaceName) {
        return this.logActivity({
            userId,
            action: activity_model_1.ActivityType.CREATE,
            resourceType: activity_model_1.ResourceType.CABINET,
            resourceId: cabinetId,
            resourceName: cabinetName,
            details: `Cabinet created in space ${spaceName}`
        });
    }
    /**
     * Log cabinet approval activity
     */
    static async logCabinetApproval(userId, cabinetId, cabinetName) {
        return this.logActivity({
            userId,
            action: activity_model_1.ActivityType.APPROVE,
            resourceType: activity_model_1.ResourceType.CABINET,
            resourceId: cabinetId,
            resourceName: cabinetName,
            details: 'Cabinet was approved',
        });
    }
    /**
     * Log cabinet rejection activity
     */
    static async logCabinetRejection(userId, cabinetId, cabinetName, reason) {
        return this.logActivity({
            userId,
            action: activity_model_1.ActivityType.REJECT,
            resourceType: activity_model_1.ResourceType.CABINET,
            resourceId: cabinetId,
            resourceName: cabinetName,
            details: `Cabinet was rejected. Reason: ${reason}`,
        });
    }
    /**
     * Log cabinet deletion activity
     */
    static async logCabinetDeletion(userId, cabinetId, cabinetName) {
        return this.logActivity({
            userId,
            action: activity_model_1.ActivityType.DELETE,
            resourceType: activity_model_1.ResourceType.CABINET,
            resourceId: cabinetId,
            resourceName: cabinetName,
            details: 'Cabinet was deleted',
        });
    }
    /**
     * Log cabinet assignment activity
     */
    static async logCabinetAssignment(userId, cabinetId, cabinetName, assignedUserId) {
        return this.logActivity({
            userId,
            action: activity_model_1.ActivityType.REASSIGN,
            resourceType: activity_model_1.ResourceType.CABINET,
            resourceId: cabinetId,
            resourceName: cabinetName,
            details: `User ${assignedUserId} assigned to cabinet`
        });
    }
    /**
     * Log cabinet permission update activity
     */
    static async logCabinetPermissionUpdate(userId, cabinetId, cabinetName, role) {
        return this.logActivity({
            userId,
            action: activity_model_1.ActivityType.UPDATE_PERMISSIONS,
            resourceType: activity_model_1.ResourceType.CABINET,
            resourceId: cabinetId,
            resourceName: cabinetName,
            details: `Cabinet permissions updated to role: ${role}`
        });
    }
    /**
     * Log record creation activity
     */
    static async logRecordCreation(userId, recordId, recordName, cabinetId, cabinetName) {
        return this.logActivity({
            userId,
            action: activity_model_1.ActivityType.CREATE,
            resourceType: activity_model_1.ResourceType.RECORD,
            resourceId: recordId,
            resourceName: recordName,
            details: `Record created in cabinet ${cabinetName}`
        });
    }
    /**
     * Log record approval activity
     */
    static async logRecordApproval(userId, recordId, recordName) {
        return this.logActivity({
            userId,
            action: activity_model_1.ActivityType.APPROVE,
            resourceType: activity_model_1.ResourceType.RECORD,
            resourceId: recordId,
            resourceName: recordName,
            details: 'Record was approved',
        });
    }
    /**
     * Log record rejection activity
     */
    static async logRecordRejection(userId, recordId, recordName, reason) {
        return this.logActivity({
            userId,
            action: activity_model_1.ActivityType.REJECT,
            resourceType: activity_model_1.ResourceType.RECORD,
            resourceId: recordId,
            resourceName: recordName,
            details: `Record was rejected. Reason: ${reason}`,
        });
    }
    /**
     * Log record update activity
     */
    static async logRecordUpdate(userId, recordId, recordName) {
        return this.logActivity({
            userId,
            action: activity_model_1.ActivityType.UPDATE,
            resourceType: activity_model_1.ResourceType.RECORD,
            resourceId: recordId,
            resourceName: recordName,
            details: 'Record updated'
        });
    }
    /**
     * Log record deletion activity
     */
    static async logRecordDeletion(userId, recordId, recordName) {
        return this.logActivity({
            userId,
            action: activity_model_1.ActivityType.DELETE,
            resourceType: activity_model_1.ResourceType.RECORD,
            resourceId: recordId,
            resourceName: recordName,
            details: 'Record was deleted',
        });
    }
    /**
     * Get activities for a specific resource
     */
    static async getResourceActivities(resourceType, resourceId, filter, dateRange) {
        try {
            const whereClause = {
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
                    [sequelize_1.Op.between]: [dateRange.from, dateRange.to],
                };
            }
            const activities = await activity_model_1.Activity.findAll({
                where: whereClause,
                include: [
                    {
                        model: user_model_1.User,
                        as: 'user',
                        attributes: ['id', 'firstName', 'lastName', 'email', 'avatar'],
                    },
                ],
                order: [['timestamp', 'DESC']],
            });
            return activities;
        }
        catch (error) {
            console.error('Error fetching resource activities:', error);
            throw error;
        }
    }
    /**
     * Get recent activities across all resources for a user
     */
    static async getRecentActivities(userId, limit = 20) {
        try {
            const whereClause = {};
            // Filter by user if provided
            if (userId) {
                whereClause.userId = userId;
            }
            const activities = await activity_model_1.Activity.findAll({
                where: whereClause,
                include: [
                    {
                        model: user_model_1.User,
                        as: 'user',
                        attributes: ['id', 'firstName', 'lastName', 'email', 'avatar'],
                    },
                ],
                order: [['timestamp', 'DESC']],
                limit,
            });
            return activities;
        }
        catch (error) {
            console.error('Error fetching recent activities:', error);
            throw error;
        }
    }
    static async getOrganizationActivities(organizationId, limit = 50) {
        try {
            // Get all user IDs belonging to this organization
            const organizationMembers = await organization_member_model_1.OrganizationMember.findAll({
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
            const activities = await activity_model_1.Activity.findAll({
                where: {
                    userId: {
                        [sequelize_1.Op.in]: userIds
                    }
                },
                include: [
                    {
                        model: user_model_1.User,
                        as: 'user',
                        attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
                    },
                ],
                order: [['createdAt', 'DESC']],
                limit
            });
            return activities;
        }
        catch (error) {
            console.error('Error fetching organization activities:', error);
            throw error;
        }
    }
}
exports.ActivityService = ActivityService;
