"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpaceController = void 0;
const space_service_1 = require("../../services/space.service");
const errorHandler_1 = require("../middlewares/errorHandler");
const cabinet_service_1 = require("../../services/cabinet.service");
const space_member_model_1 = require("../../models/space-member.model");
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../../infrastructure/database/sequelize");
// Constants and Types
const VALID_ROLES = ['member', 'co-owner', 'readonly'];
const VALID_STATUSES = ['pending', 'approved', 'rejected'];
class SpaceController {
    // region: Utility Methods
    static validateUser(req) {
        var _a;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId)
            throw new errorHandler_1.AppError(401, 'Unauthorized');
        return userId;
    }
    static validateStatus(status) {
        if (!status || typeof status !== 'string') {
            throw new errorHandler_1.AppError(400, 'Status parameter is required');
        }
        if (!VALID_STATUSES.includes(status)) {
            throw new errorHandler_1.AppError(400, `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
        }
        return status;
    }
    static validateRole(role) {
        if (!role)
            throw new errorHandler_1.AppError(400, 'Role is required');
        if (!VALID_ROLES.includes(role)) {
            throw new errorHandler_1.AppError(400, `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`);
        }
        return role;
    }
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    static async checkSpacePermissions(spaceId, userId) {
        const space = await space_service_1.SpaceService.getSpace(spaceId);
        if (!space.owner || !space.members) {
            throw new errorHandler_1.AppError(404, 'Space data is incomplete');
        }
        // User is authorized if they are:
        // 1. The space owner
        // 2. A space member with 'co-owner' role
        // 3. A super user from the organization (We'll check this in the service layer)
        const isAuthorized = 
        // Check if user is the space owner
        space.owner.id === userId ||
            // Check if user is a co-owner
            space.members.some((m) => { var _a; return m.id === userId && ((_a = m.SpaceMember) === null || _a === void 0 ? void 0 : _a.role) === 'co-owner'; });
        if (!isAuthorized) {
            // If not owner or co-owner, we'll let the service layer handle the super_user check
            // during specific operations like deleteSpace that allow super_user access
            throw new errorHandler_1.AppError(403, 'Insufficient permissions');
        }
    }
    // endregion
    // region: Core Space Operations
    static async createSpace(req, res, next) {
        try {
            const userId = SpaceController.validateUser(req);
            const parsedBody = Object.assign(Object.assign({}, req.body), { tags: req.body.tags ? JSON.parse(req.body.tags) : [], users: req.body.users ? JSON.parse(req.body.users) : [], approvers: req.body.approvers ? JSON.parse(req.body.approvers) : [], requireApproval: req.body.requireApproval, logo: req.file, ownerId: userId });
            console.log(parsedBody);
            const space = await space_service_1.SpaceService.createSpace(parsedBody);
            res.status(201).json(space);
        }
        catch (error) {
            next(error);
        }
    }
    static async getSpace(req, res, next) {
        try {
            const space = await space_service_1.SpaceService.getSpace(req.params.id);
            res.json(space);
        }
        catch (error) {
            next(error);
        }
    }
    static async deleteSpace(req, res, next) {
        try {
            const { id: spaceId } = req.params;
            const userId = SpaceController.validateUser(req);
            // Skip the permission check here - the service layer will handle it
            // The service layer checks for space owners and super_users
            await space_service_1.SpaceService.deleteSpace(spaceId, userId);
            res.status(200).json({ message: 'Space deleted successfully' });
        }
        catch (error) {
            next(error);
        }
    }
    // endregion
    // region: Member Management
    static async addMember(req, res, next) {
        try {
            const { id: spaceId } = req.params;
            const userId = SpaceController.validateUser(req);
            const { userId: memberId, role } = req.body;
            await SpaceController.checkSpacePermissions(spaceId, userId);
            await space_service_1.SpaceService.addMember(spaceId, memberId, SpaceController.validateRole(role));
            res.status(204).send();
        }
        catch (error) {
            next(error);
        }
    }
    static async removeMember(req, res, next) {
        try {
            const { id: spaceId, userId: memberId } = req.params;
            const userId = SpaceController.validateUser(req);
            await SpaceController.checkSpacePermissions(spaceId, userId);
            await space_service_1.SpaceService.removeMember(spaceId, memberId);
            res.status(204).send();
        }
        catch (error) {
            next(error);
        }
    }
    static async updateMemberRole(req, res, next) {
        try {
            const { id: spaceId, userId: memberId } = req.params;
            const userId = SpaceController.validateUser(req);
            const role = SpaceController.validateRole(req.body.role);
            await SpaceController.checkSpacePermissions(spaceId, userId);
            await space_service_1.SpaceService.updateMemberRole(spaceId, memberId, role);
            res.status(200).json({ message: 'Member role updated successfully' });
        }
        catch (error) {
            next(error);
        }
    }
    static async inviteMembers(req, res, next) {
        try {
            const { id: spaceId } = req.params;
            const userId = SpaceController.validateUser(req);
            const { emails, role, message } = req.body;
            if (!Array.isArray(emails)) {
                throw new errorHandler_1.AppError(400, 'Invalid email list format');
            }
            await SpaceController.checkSpacePermissions(spaceId, userId);
            const validatedEmails = emails.filter(email => typeof email === 'string' && SpaceController.isValidEmail(email));
            const results = await space_service_1.SpaceService.inviteMembers(spaceId, {
                emails: validatedEmails,
                role: SpaceController.validateRole(role),
                message: (message === null || message === void 0 ? void 0 : message.toString()) || '',
                inviterId: userId
            });
            res.status(200).json({
                message: `${results.length} invitations sent successfully`,
                results
            });
        }
        catch (error) {
            next(error);
        }
    }
    // endregion
    // region: Query Endpoints
    static async getAllSpaces(_req, res, next) {
        try {
            const spaces = await space_service_1.SpaceService.getAllSpaces();
            res.json(spaces);
        }
        catch (error) {
            next(error);
        }
    }
    static async getSpacesByStatus(req, res, next) {
        try {
            const status = SpaceController.validateStatus(req.query.status);
            const spaces = await space_service_1.SpaceService.getSpacesByStatus(status);
            res.json(spaces);
        }
        catch (error) {
            next(error);
        }
    }
    static async getMySpacesByStatus(req, res, next) {
        try {
            const userId = SpaceController.validateUser(req);
            const status = SpaceController.validateStatus(req.query.status);
            const spaces = await space_service_1.SpaceService.getMySpacesByStatus(userId, status);
            res.json(spaces);
        }
        catch (error) {
            next(error);
        }
    }
    static async getAvailableUsers(_req, res, next) {
        try {
            const users = await space_service_1.SpaceService.getAvailableUsers();
            res.json(users);
        }
        catch (error) {
            next(error);
        }
    }
    static async getSuperUsers(_req, res, next) {
        try {
            const superUsers = await space_service_1.SpaceService.getSuperUsers();
            res.json(superUsers);
        }
        catch (error) {
            next(error);
        }
    }
    // endregion
    // region: Approval Workflow
    static async getSpacesWaitingForMyApproval(req, res, next) {
        try {
            const spaces = await space_service_1.SpaceService.getApprovalsWaitingFor(SpaceController.validateUser(req));
            res.json(spaces);
        }
        catch (error) {
            next(error);
        }
    }
    static async reassignApproval(req, res, next) {
        var _a;
        try {
            const { id: spaceId } = req.params;
            const userId = SpaceController.validateUser(req);
            await space_service_1.SpaceService.reassignApproval(spaceId, userId, req.body.assigneeId, ((_a = req.body.message) === null || _a === void 0 ? void 0 : _a.toString()) || '');
            res.status(200).json({ message: 'Approval reassigned successfully' });
        }
        catch (error) {
            next(error);
        }
    }
    static async resubmitSpace(req, res, next) {
        const transaction = await sequelize_2.sequelize.transaction();
        try {
            const { id: spaceId } = req.params;
            const userId = SpaceController.validateUser(req);
            const { message, spaceData } = req.body;
            // First resubmit the space to change its status
            const space = await space_service_1.SpaceService.resubmitSpace(spaceId, (message === null || message === void 0 ? void 0 : message.toString()) || '', userId);
            // If spaceData is provided, update the space details
            if (spaceData) {
                // Update basic space information
                await space.update({
                    name: spaceData.name,
                    company: spaceData.company,
                    country: spaceData.country,
                    tags: spaceData.tags || [],
                    settings: Object.assign(Object.assign({}, space.settings), { userGroup: spaceData.userGroup })
                }, { transaction });
                // Update members if provided
                if (spaceData.members && Array.isArray(spaceData.members)) {
                    // Remove all existing members except the owner
                    await space_member_model_1.SpaceMember.destroy({
                        where: {
                            spaceId,
                            userId: { [sequelize_1.Op.ne]: space.ownerId } // Don't remove the owner
                        },
                        transaction
                    });
                    // Add new members
                    const memberPromises = spaceData.members
                        .filter((member) => member.userId !== space.ownerId) // Skip owner as they're already a member
                        .map((member) => space_member_model_1.SpaceMember.create({
                        spaceId,
                        userId: member.userId,
                        role: member.role || 'member',
                        permissions: member.permissions || []
                    }, { transaction }));
                    await Promise.all(memberPromises);
                }
            }
            await transaction.commit();
            res.status(200).json({ message: 'Space resubmitted successfully', space });
        }
        catch (error) {
            await transaction.rollback();
            next(error);
        }
    }
    static async getReassignmentHistory(req, res, next) {
        try {
            const history = await space_service_1.SpaceService.getReassignmentHistory(req.params.id);
            res.json(history);
        }
        catch (error) {
            next(error);
        }
    }
    // endregion
    // region: Cabinet Integration
    static async getCabinets(req, res, next) {
        try {
            const cabinets = await cabinet_service_1.CabinetService.getApprovedCabinets(req.params.id);
            res.json(cabinets);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.SpaceController = SpaceController;
