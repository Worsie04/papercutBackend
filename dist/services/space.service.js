"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpaceService = void 0;
const sequelize_1 = require("sequelize");
const space_model_1 = require("../models/space.model");
const user_model_1 = require("../models/user.model");
const errorHandler_1 = require("../presentation/middlewares/errorHandler");
const sequelize_2 = require("../infrastructure/database/sequelize");
const upload_util_1 = require("../utils/upload.util");
const spaceInvitation_model_1 = require("../models/spaceInvitation.model");
const email_util_1 = require("../utils/email.util");
const space_member_model_1 = require("../models/space-member.model");
const cabinet_model_1 = require("../models/cabinet.model");
const organization_member_model_1 = require("../models/organization-member.model");
const space_comment_service_1 = require("./space-comment.service");
const space_reassignment_model_1 = require("../models/space-reassignment.model");
const record_model_1 = require("../models/record.model");
const notification_service_1 = require("./notification.service");
const activity_service_1 = require("./activity.service");
const activity_model_1 = require("../models/activity.model");
const sequelize_3 = require("sequelize");
class SpaceService {
    static async getAvailableUsers() {
        const users = await user_model_1.User.findAll({
            where: { isActive: true },
            attributes: ['id', 'firstName', 'lastName', 'email'],
        });
        return users;
    }
    static async getSuperUsers() {
        try {
            // Find organization members with super_user role
            const organizationMembers = await organization_member_model_1.OrganizationMember.findAll({
                where: { role: 'super_user' },
                include: [{
                        model: user_model_1.User,
                        as: 'user',
                        attributes: ['id', 'firstName', 'lastName', 'email']
                    }]
            });
            // Transform the data to match the User interface
            const superUsers = organizationMembers.map(member => {
                const user = member.user;
                return {
                    id: user.id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email
                };
            });
            return superUsers;
        }
        catch (error) {
            console.error('Error fetching super users:', error);
            throw error;
        }
    }
    static async createSpace(data) {
        const existingSpace = await space_model_1.Space.findOne({
            where: { name: data.name },
        });
        if (existingSpace) {
            throw new errorHandler_1.AppError(400, 'Space with this name already exists');
        }
        // Upload logo if provided
        let logoUrl;
        if (data.logo) {
            logoUrl = await (0, upload_util_1.uploadFile)(data.logo, 'spaces/logos');
        }
        // Create space and assign members in a transaction
        const space = await sequelize_2.sequelize.transaction(async (transaction) => {
            const newSpace = await space_model_1.Space.create({
                name: data.name,
                company: data.company,
                tags: Array.isArray(data.tags) ? data.tags : [],
                country: data.country,
                logo: logoUrl,
                requireApproval: data.requireApproval,
                approvers: data.requireApproval && Array.isArray(data.approvers) ? data.approvers : [],
                description: data.description,
                type: space_model_1.SpaceType.CORPORATE,
                ownerId: data.ownerId,
                createdById: data.ownerId,
                settings: {
                    userGroup: data.userGroup,
                },
                status: 'approved',
            }, { transaction });
            // Add members to the space
            if (data.users.length > 0) {
                const users = await user_model_1.User.findAll({
                    where: { id: data.users },
                    transaction,
                });
                if (users.length !== data.users.length) {
                    const foundUserIds = users.map(user => user.id);
                    const missingUserIds = data.users.filter(id => !foundUserIds.includes(id));
                    throw new errorHandler_1.AppError(400, `Users not found: ${missingUserIds.join(', ')}`);
                }
                // Create space members directly
                await Promise.all(users.map((user) => space_member_model_1.SpaceMember.create({
                    spaceId: newSpace.id,
                    userId: user.id,
                    role: data.userGroup,
                    permissions: [],
                }, { transaction })));
            }
            return newSpace;
        });
        // Log space creation activity
        try {
            await activity_service_1.ActivityService.logSpaceCreation(data.ownerId, space.id, space.name);
        }
        catch (error) {
            console.error('Failed to log space creation activity:', error);
            // Don't fail the space creation if activity logging fails
        }
        // Send notifications to approvers if approval is required
        if (data.requireApproval && Array.isArray(data.approvers) && data.approvers.length > 0) {
            try {
                // Get creator information for the notification
                const creator = await user_model_1.User.findByPk(data.ownerId);
                const creatorName = creator ? `${creator.firstName} ${creator.lastName}` : 'A user';
                // Send notification to each approver
                for (const approver of data.approvers) {
                    await notification_service_1.NotificationService.createSpaceCreationNotification(approver.userId, space.id, space.name, creatorName);
                }
            }
            catch (error) {
                console.error('Error sending space creation notifications:', error);
                // We don't want to fail the space creation if notifications fail
            }
        }
        // Fetch the space with member information
        return this.getSpace(space.id);
    }
    static async getSpace(id) {
        const space = await space_model_1.Space.findByPk(id, {
            include: [
                {
                    model: user_model_1.User,
                    as: 'members',
                    through: {
                        attributes: ['role']
                    },
                    attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
                },
                {
                    model: user_model_1.User,
                    as: 'owner',
                    attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
                },
                {
                    model: user_model_1.User,
                    as: 'creator',
                    attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
                }
            ]
        });
        if (!space) {
            throw new errorHandler_1.AppError(404, 'Space not found');
        }
        return space;
    }
    static async addMember(spaceId, userId, role = 'member') {
        const [space, user] = await Promise.all([
            space_model_1.Space.findByPk(spaceId),
            user_model_1.User.findByPk(userId),
        ]);
        if (!space) {
            throw new errorHandler_1.AppError(404, 'Space not found');
        }
        if (!user) {
            throw new errorHandler_1.AppError(404, 'User not found');
        }
        await space.addMember(user, {
            through: {
                role,
                permissions: [],
            },
        });
    }
    static async removeMember(spaceId, userId) {
        const space = await space_model_1.Space.findByPk(spaceId);
        if (!space) {
            throw new errorHandler_1.AppError(404, 'Space not found');
        }
        const removed = await space.removeMember(userId);
        if (!removed) {
            throw new errorHandler_1.AppError(404, 'User is not a member of this space');
        }
    }
    static async getAllSpaces() {
        const spaces = await space_model_1.Space.findAll({
            where: {
                status: 'approved'
            },
            include: [
                {
                    model: user_model_1.User,
                    as: 'owner',
                    attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
                },
                {
                    model: user_model_1.User,
                    as: 'members',
                    through: { attributes: ['role'] },
                    attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
                }
            ],
            order: [['createdAt', 'DESC']]
        });
        return spaces;
    }
    static async getSpacesByStatus(status) {
        const spaces = await space_model_1.Space.findAll({
            where: { status },
            include: [
                {
                    model: user_model_1.User,
                    as: 'members',
                    through: { attributes: ['role'] },
                    attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
                },
                {
                    model: user_model_1.User,
                    as: 'owner',
                    attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
                },
                {
                    model: user_model_1.User,
                    as: 'creator',
                    attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
                }
            ],
            order: [['createdAt', 'DESC']]
        });
        return spaces;
    }
    static async getPendingApprovals(userId) {
        try {
            // console.log('Fetching pending space approvals for user:', userId);
            const pendingSpaces = await space_model_1.Space.findAll({
                where: {
                    status: 'pending'
                },
                include: [{
                        model: user_model_1.User,
                        as: 'owner',
                        attributes: ['id', 'firstName', 'lastName', 'avatar']
                    }],
                order: [['createdAt', 'DESC']]
            });
            // console.log('Found pending spaces:', pendingSpaces.length);
            return pendingSpaces.map(space => {
                var _a, _b;
                return ({
                    id: space.id,
                    name: space.name,
                    type: 'space',
                    createdBy: {
                        id: ((_a = space.owner) === null || _a === void 0 ? void 0 : _a.id) || null,
                        name: space.owner ? `${space.owner.firstName} ${space.owner.lastName}` : 'Unknown User',
                        avatar: ((_b = space.owner) === null || _b === void 0 ? void 0 : _b.avatar) || '/images/avatar.png'
                    },
                    createdAt: space.createdAt,
                    priority: 'Med'
                });
            });
        }
        catch (error) {
            console.error('Error fetching pending space approvals:', error);
            throw error;
        }
    }
    static async approveSpace(spaceId, approverId) {
        try {
            const space = await space_model_1.Space.findByPk(spaceId, {
                include: [{
                        model: user_model_1.User,
                        as: 'owner',
                        attributes: ['id', 'firstName', 'lastName']
                    }]
            });
            if (!space) {
                throw new errorHandler_1.AppError(404, 'Space not found');
            }
            await space.update({ status: 'approved' });
            // Log space approval activity
            try {
                await activity_service_1.ActivityService.logSpaceApproval(approverId, space.id, space.name);
            }
            catch (error) {
                console.error('Failed to log space approval activity:', error);
            }
            // Send notification to the space owner
            if (space.owner) {
                try {
                    await notification_service_1.NotificationService.createSpaceApprovalNotification(space.owner.id, space.id, space.name);
                    //  console.log(`Approval notification sent to space owner: ${space.owner.id}`);
                }
                catch (error) {
                    console.error('Error sending space approval notification:', error);
                }
            }
            return space;
        }
        catch (error) {
            console.error('Error approving space:', error);
            throw error;
        }
    }
    static async rejectSpace(spaceId, reason, rejectedBy) {
        try {
            const space = await space_model_1.Space.findByPk(spaceId, {
                include: [{
                        model: user_model_1.User,
                        as: 'owner',
                        attributes: ['id', 'firstName', 'lastName']
                    }]
            });
            if (!space) {
                throw new Error('Space not found');
            }
            await space.update({
                status: 'rejected',
                rejectionReason: reason,
                rejectedBy
            });
            // Log space rejection activity
            try {
                await activity_service_1.ActivityService.logSpaceRejection(rejectedBy, space.id, space.name, reason);
            }
            catch (error) {
                console.error('Failed to log space rejection activity:', error);
            }
            // Send notification to the space owner
            if (space.owner) {
                try {
                    await notification_service_1.NotificationService.createSpaceRejectionNotification(space.owner.id, space.id, space.name, reason);
                    //  console.log(`Rejection notification sent to space owner: ${space.owner.id}`);
                }
                catch (error) {
                    console.error('Error sending space rejection notification:', error);
                    // We don't want to fail the space rejection if the notification fails
                }
            }
            return space;
        }
        catch (error) {
            console.error('Error rejecting space:', error);
            throw error;
        }
    }
    static async resubmitSpace(spaceId, message, userId) {
        const transaction = await sequelize_2.sequelize.transaction();
        try {
            const space = await space_model_1.Space.findByPk(spaceId, {
                include: [{
                        model: user_model_1.User,
                        as: 'owner',
                        attributes: ['id', 'firstName', 'lastName']
                    }],
                transaction
            });
            if (!space) {
                throw new errorHandler_1.AppError(404, 'Space not found');
            }
            // Verify the user is the owner
            if (space.ownerId !== userId) {
                throw new errorHandler_1.AppError(403, 'Only the space owner can resubmit');
            }
            // Update space status
            await space.update({
                status: 'pending',
                rejectionReason: null,
                rejectedBy: null
            }, { transaction });
            // Add a comment about the resubmission
            await space_comment_service_1.SpaceCommentService.createComment({
                spaceId,
                userId,
                message: message || 'Space resubmitted for approval.',
                type: 'update',
                transaction
            });
            // Log space resubmission activity
            try {
                await activity_service_1.ActivityService.logActivity({
                    userId,
                    action: activity_model_1.ActivityType.RESUBMIT,
                    resourceType: activity_model_1.ResourceType.SPACE,
                    resourceId: spaceId,
                    resourceName: space.name,
                    details: message || 'Space resubmitted for approval.',
                    transaction
                });
            }
            catch (error) {
                console.error('Failed to log space resubmission activity:', error);
            }
            // Send notifications to approvers
            if (space.approvers && Array.isArray(space.approvers) && space.approvers.length > 0) {
                try {
                    // Get submitter information for the notification
                    const submitter = await user_model_1.User.findByPk(userId, { transaction });
                    const submitterName = submitter ? `${submitter.firstName} ${submitter.lastName}` : 'A user';
                    // Send notification to each approver
                    for (const approver of space.approvers) {
                        await notification_service_1.NotificationService.createSpaceCreationNotification(approver.userId, space.id, space.name, submitterName);
                    }
                }
                catch (error) {
                    console.error('Error sending space resubmission notifications:', error);
                }
            }
            await transaction.commit();
            return space;
        }
        catch (error) {
            await transaction.rollback();
            console.error('Error resubmitting space:', error);
            throw error;
        }
    }
    static async inviteMembers(spaceId, { emails, role, message, inviterId }) {
        const results = [];
        const space = await space_model_1.Space.findByPk(spaceId);
        const inviter = await user_model_1.User.findByPk(inviterId);
        if (!space) {
            throw new errorHandler_1.AppError(404, 'Space not found');
        }
        if (!inviter) {
            throw new errorHandler_1.AppError(404, 'Inviter not found');
        }
        // Process each email
        for (const email of emails) {
            try {
                // Check if user already exists
                let user = await user_model_1.User.findOne({ where: { email } });
                if (user) {
                    // Check if user is already a member
                    const isMember = await space_member_model_1.SpaceMember.findOne({
                        where: {
                            spaceId,
                            userId: user.id
                        }
                    });
                    if (isMember) {
                        results.push({
                            email,
                            status: 'error',
                            message: 'User is already a member of this space'
                        });
                        continue;
                    }
                    // Add user as member
                    await space.addMember(user, {
                        through: {
                            role,
                            permissions: []
                        }
                    });
                    results.push({
                        email,
                        status: 'success',
                        message: 'User added as member'
                    });
                }
                else {
                    // Create invitation record
                    await spaceInvitation_model_1.SpaceInvitation.create({
                        spaceId,
                        email,
                        role,
                        inviterId,
                        status: 'pending',
                        message
                    });
                    // Send invitation email
                    await (0, email_util_1.sendInvitationEmail)({
                        to: email,
                        spaceName: space.name,
                        inviterName: `${inviter.firstName} ${inviter.lastName}`,
                        role,
                        message,
                        invitationLink: `${process.env.CLIENT_URL}/invitations/accept?space=${spaceId}&email=${encodeURIComponent(email)}`
                    });
                    results.push({
                        email,
                        status: 'success',
                        message: 'Invitation sent'
                    });
                }
            }
            catch (error) {
                console.error(`Error processing invitation for ${email}:`, error);
                results.push({
                    email,
                    status: 'error',
                    message: 'Failed to process invitation'
                });
            }
        }
        return results;
    }
    static async updateMemberRole(spaceId, userId, role) {
        const spaceMember = await space_member_model_1.SpaceMember.findOne({
            where: {
                spaceId,
                userId
            }
        });
        if (!spaceMember) {
            throw new errorHandler_1.AppError(404, 'Member not found in this space');
        }
        await spaceMember.update({ role });
    }
    static async getMyPendingApprovals(userId) {
        try {
            // console.log('Fetching spaces created by user that are pending approval:', userId);
            const pendingSpaces = await space_model_1.Space.findAll({
                where: {
                    status: 'pending',
                    requireApproval: true,
                    createdById: userId
                },
                include: [{
                        model: user_model_1.User,
                        as: 'owner',
                        attributes: ['id', 'firstName', 'lastName', 'avatar']
                    }],
                order: [['createdAt', 'DESC']]
            });
            // console.log('Found pending spaces created by this user:', pendingSpaces.length);
            return pendingSpaces.map(space => ({
                id: space.id,
                name: space.name,
                status: space.status,
                createdAt: space.createdAt,
                updatedAt: space.updatedAt,
                owner: space.owner ? {
                    firstName: space.owner.firstName,
                    lastName: space.owner.lastName,
                    avatar: space.owner.avatar
                } : null
            }));
        }
        catch (error) {
            console.error('Error fetching my pending space approvals:', error);
            throw error;
        }
    }
    static async getApprovalsWaitingFor(userId) {
        try {
            // console.log('Fetching spaces waiting for approval by user:', userId);
            const pendingSpaces = await space_model_1.Space.findAll({
                where: {
                    status: 'pending',
                    requireApproval: true,
                    approvers: {
                        [sequelize_3.Op.contains]: [{ userId }]
                    }
                },
                include: [{
                        model: user_model_1.User,
                        as: 'owner',
                        attributes: ['id', 'firstName', 'lastName', 'avatar']
                    }],
                order: [['createdAt', 'DESC']]
            });
            return pendingSpaces.map(space => ({
                id: space.id,
                name: space.name,
                status: space.status,
                createdAt: space.createdAt,
                updatedAt: space.updatedAt,
                owner: space.owner ? {
                    firstName: space.owner.firstName,
                    lastName: space.owner.lastName,
                    avatar: space.owner.avatar
                } : null
            }));
        }
        catch (error) {
            console.error('Error fetching spaces waiting for approval:', error);
            throw error;
        }
    }
    static async reassignApproval(spaceId, currentUserId, assigneeId, message) {
        try {
            // console.log(`Reassigning approval for space ${spaceId} from user ${currentUserId} to user ${assigneeId}`);
            // 1. Verify the space exists
            const space = await space_model_1.Space.findByPk(spaceId);
            if (!space) {
                throw new Error('Space not found');
            }
            // 2. Verify the space is in pending status
            if (space.status !== 'pending') {
                throw new Error('Only pending spaces can be reassigned');
            }
            // 3. Verify current user exists
            const currentUser = await user_model_1.User.findByPk(currentUserId);
            if (!currentUser) {
                throw new Error('Current user not found');
            }
            // 4. Get the current user's organization
            const userOrganizations = await organization_member_model_1.OrganizationMember.findAll({
                where: {
                    userId: currentUserId,
                    status: 'active'
                }
            });
            if (!userOrganizations || userOrganizations.length === 0) {
                throw new Error('User is not a member of any organization');
            }
            const organizationIds = userOrganizations.map((org) => org.organizationId);
            // 5. Verify the assignee is a super user in the same organization
            const assigneeOrganizationMemberships = await organization_member_model_1.OrganizationMember.findAll({
                where: {
                    userId: assigneeId,
                    organizationId: organizationIds,
                    role: 'super_user',
                    status: 'active'
                }
            });
            if (!assigneeOrganizationMemberships || assigneeOrganizationMemberships.length === 0) {
                throw new Error('Assignee is not a super user in your organization');
            }
            // Get the Sequelize transaction to ensure atomicity
            const transaction = await sequelize_2.sequelize.transaction();
            try {
                // 6. Update the space's approvers array
                // Get current approvers array or initialize empty array if not present
                const currentApprovers = space.approvers || [];
                // Create new approvers array with the new assignee
                let updatedApprovers;
                if (Array.isArray(currentApprovers)) {
                    // Replace the user with the new assignee while maintaining order
                    updatedApprovers = currentApprovers.map(approver => {
                        if (approver.userId === currentUserId) {
                            return Object.assign(Object.assign({}, approver), { userId: assigneeId });
                        }
                        return approver;
                    });
                    // If the current user wasn't in the approvers list, add the assignee
                    if (!currentApprovers.some(approver => approver.userId === currentUserId)) {
                        updatedApprovers.push({ userId: assigneeId, order: currentApprovers.length + 1 });
                    }
                }
                else {
                    // If approvers isn't an array, create a new one with the assignee
                    updatedApprovers = [{ userId: assigneeId, order: 1 }];
                }
                // Update the space with the new approvers array
                await space.update({ approvers: updatedApprovers }, { transaction });
                // 7. Create a record in the SpaceReassignment table to track history
                await space_reassignment_model_1.SpaceReassignment.create({
                    spaceId: spaceId,
                    fromUserId: currentUserId,
                    toUserId: assigneeId,
                    message: message || 'Approval reassigned'
                }, { transaction });
                // Log reassignment activity
                try {
                    const space = await space_model_1.Space.findByPk(spaceId);
                    if (space) {
                        await activity_service_1.ActivityService.logSpaceReassignment(currentUserId, spaceId, space.name, assigneeId);
                    }
                }
                catch (error) {
                    console.error('Failed to log space reassignment activity:', error);
                }
                // Commit the transaction if all operations succeed
                await transaction.commit();
                // 8. Log the reassignment
                // console.log(`Successfully reassigned approval for space ${spaceId} to user ${assigneeId}`);
                // console.log(`Updated approvers:`, JSON.stringify(updatedApprovers, null, 2));
                // 9. Log space activity (simplified)
                // console.log(`Activity logged for space ${spaceId}: reassign - Reassigned approval to another user`);
            }
            catch (error) {
                // Rollback the transaction if any operation fails
                await transaction.rollback();
                throw error;
            }
        }
        catch (error) {
            console.error('Error reassigning space approval:', error);
            throw error;
        }
    }
    static async getReassignmentHistory(spaceId) {
        try {
            const reassignments = await space_reassignment_model_1.SpaceReassignment.findAll({
                where: { spaceId },
                include: [
                    {
                        model: user_model_1.User,
                        as: 'fromUser',
                        attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
                    },
                    {
                        model: user_model_1.User,
                        as: 'toUser',
                        attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
                    }
                ],
                order: [['createdAt', 'DESC']]
            });
            return reassignments.map(item => ({
                id: item.id,
                spaceId: item.spaceId,
                fromUser: item.fromUser,
                toUser: item.toUser,
                message: item.message,
                createdAt: item.createdAt
            }));
        }
        catch (error) {
            console.error('Error fetching space reassignment history:', error);
            throw error;
        }
    }
    static async getMySpacesByStatus(userId, status) {
        try {
            const spaces = await space_model_1.Space.findAll({
                where: {
                    status,
                    createdById: userId
                },
                include: [{
                        model: user_model_1.User,
                        as: 'owner',
                        attributes: ['id', 'firstName', 'lastName', 'avatar']
                    }],
                order: [['createdAt', 'DESC']]
            });
            // console.log(`Found ${spaces.length} spaces with status ${status} created by this user`);
            if (spaces.length > 0) {
                // console.log('First space example:', JSON.stringify(spaces[0], null, 2));
            }
            return spaces.map((space) => {
                const ownerData = space.owner ? {
                    firstName: space.owner.firstName || 'Unknown',
                    lastName: space.owner.lastName || 'User',
                    avatar: space.owner.avatar || null
                } : {
                    firstName: 'Unknown',
                    lastName: 'User',
                    avatar: null
                };
                return {
                    id: space.id,
                    name: space.name || 'Unnamed Space',
                    status: space.status,
                    createdAt: space.createdAt,
                    updatedAt: space.updatedAt,
                    owner: ownerData
                };
            });
        }
        catch (error) {
            console.error(`Error fetching spaces with status ${status}:`, error);
            throw error;
        }
    }
    static async deleteSpace(spaceId, userId) {
        try {
            // console.log(`Attempting to delete space ${spaceId} by user ${userId}`);
            // 1. Verify the space exists
            const space = await space_model_1.Space.findByPk(spaceId, {
                include: [{
                        model: user_model_1.User,
                        as: 'owner',
                        attributes: ['id', 'firstName', 'lastName']
                    }]
            });
            if (!space) {
                throw new Error('Space not found');
            }
            const userOrganizations = await organization_member_model_1.OrganizationMember.findAll({
                where: {
                    userId,
                    status: 'active',
                    role: 'super_user'
                }
            });
            const isSuperUser = userOrganizations.length > 0;
            const isOwner = space.ownerId === userId;
            if (!isSuperUser && !isOwner) {
                throw new Error('You do not have permission to delete this space');
            }
            // Store space name for logging before deletion
            const spaceName = space.name;
            const spaceOwnerId = space.ownerId;
            // 3. Delete all related records using a transaction
            const transaction = await sequelize_2.sequelize.transaction();
            try {
                // Delete space members
                await space_member_model_1.SpaceMember.destroy({
                    where: { spaceId },
                    transaction
                });
                // Delete space reassignments using raw SQL to ensure correct column name
                await sequelize_2.sequelize.query(`DELETE FROM space_reassignments WHERE "space_id" = :spaceId`, {
                    replacements: { spaceId },
                    type: sequelize_1.QueryTypes.DELETE,
                    transaction
                });
                // Delete space invitations
                await spaceInvitation_model_1.SpaceInvitation.destroy({
                    where: { spaceId },
                    transaction
                });
                // Delete space comments - using the correct table name space_comments_rejects
                await sequelize_2.sequelize.query(`DELETE FROM space_comments_rejects WHERE "space_id" = :spaceId`, {
                    replacements: { spaceId },
                    type: sequelize_1.QueryTypes.DELETE,
                    transaction
                });
                // Delete any cabinets in the space
                const cabinets = await cabinet_model_1.Cabinet.findAll({
                    where: { spaceId },
                    transaction
                });
                for (const cabinet of cabinets) {
                    // Delete cabinet members
                    await sequelize_2.sequelize.query(`DELETE FROM cabinet_members WHERE "cabinet_id" = :cabinetId`, {
                        replacements: { cabinetId: cabinet.id },
                        type: sequelize_1.QueryTypes.DELETE,
                        transaction
                    });
                    // Delete cabinet followers
                    await sequelize_2.sequelize.query(`DELETE FROM cabinet_followers WHERE "cabinet_id" = :cabinetId`, {
                        replacements: { cabinetId: cabinet.id },
                        type: sequelize_1.QueryTypes.DELETE,
                        transaction
                    });
                    // Delete records in the cabinet
                    const records = await record_model_1.Record.findAll({
                        where: { cabinetId: cabinet.id },
                        transaction
                    });
                    for (const record of records) {
                        // Delete record versions
                        await sequelize_2.sequelize.query(`DELETE FROM record_versions WHERE "record_id" = :recordId`, {
                            replacements: { recordId: record.id },
                            type: sequelize_1.QueryTypes.DELETE,
                            transaction
                        });
                        // Delete record notes/comments
                        await sequelize_2.sequelize.query(`DELETE FROM records_notes_comments WHERE "record_id" = :recordId`, {
                            replacements: { recordId: record.id },
                            type: sequelize_1.QueryTypes.DELETE,
                            transaction
                        });
                        // Delete the record itself
                        await record.destroy({ transaction });
                    }
                    // Delete the cabinet
                    await cabinet.destroy({ transaction });
                }
                // Finally, delete the space
                await space.destroy({ transaction });
                // Commit the transaction
                await transaction.commit();
                // Log space deletion activity after successful deletion
                try {
                    await activity_service_1.ActivityService.logSpaceDeletion(userId, spaceId, spaceName);
                }
                catch (error) {
                    console.error('Failed to log space deletion activity:', error);
                }
                // Send notification if needed
                if (isSuperUser && !isOwner && spaceOwnerId !== userId) {
                    try {
                        await notification_service_1.NotificationService.createSpaceDeletionNotification(space.id, spaceOwnerId, spaceName, userId);
                        // console.log(`Space deletion notification sent to space owner: ${spaceOwnerId}`);
                    }
                    catch (error) {
                        console.error('Error sending space deletion notification:', error);
                    }
                }
                // console.log(`Successfully deleted space ${spaceId}`);
                return true;
            }
            catch (error) {
                // Rollback the transaction if any operation fails
                await transaction.rollback();
                console.error('Error during space deletion:', error);
                throw error;
            }
        }
        catch (error) {
            console.error('Error deleting space:', error);
            throw error;
        }
    }
}
exports.SpaceService = SpaceService;
