"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpaceController = void 0;
const space_service_1 = require("../../services/space.service");
const errorHandler_1 = require("../middlewares/errorHandler");
const cabinet_service_1 = require("../../services/cabinet.service");
class SpaceController {
    static async createSpace(req, res, next) {
        var _a;
        console.log("req.user:", req.user);
        console.log("req.body:", req.body);
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                throw new errorHandler_1.AppError(401, 'Unauthorized');
            }
            // Parse JSON strings for arrays
            const body = Object.assign(Object.assign({}, req.body), { tags: req.body.tags ? JSON.parse(req.body.tags) : [], users: req.body.users ? JSON.parse(req.body.users) : [], requireApproval: req.body.requireApproval === 'true' });
            const space = await space_service_1.SpaceService.createSpace(Object.assign(Object.assign({}, body), { logo: req.file, ownerId: userId }));
            res.status(201).json(space);
        }
        catch (error) {
            next(error);
        }
    }
    static async getSpace(req, res, next) {
        try {
            const { id } = req.params;
            const space = await space_service_1.SpaceService.getSpace(id);
            res.json(space);
        }
        catch (error) {
            next(error);
        }
    }
    static async addMember(req, res, next) {
        try {
            const { id } = req.params;
            const { userId, role } = req.body;
            await space_service_1.SpaceService.addMember(id, userId, role);
            res.status(204).send();
        }
        catch (error) {
            next(error);
        }
    }
    static async removeMember(req, res, next) {
        try {
            const { id, userId } = req.params;
            await space_service_1.SpaceService.removeMember(id, userId);
            res.status(204).send();
        }
        catch (error) {
            next(error);
        }
    }
    static async getAvailableUsers(req, res, next) {
        try {
            const users = await space_service_1.SpaceService.getAvailableUsers();
            res.json(users);
        }
        catch (error) {
            next(error);
        }
    }
    static async getAllSpaces(req, res, next) {
        try {
            const spaces = await space_service_1.SpaceService.getAllSpaces();
            res.json(spaces);
        }
        catch (error) {
            next(error);
        }
    }
    static async inviteMembers(req, res, next) {
        try {
            const { id: spaceId } = req.params;
            const { emails, role, message } = req.body;
            if (!req.user) {
                throw new errorHandler_1.AppError(401, 'Unauthorized');
            }
            if (!Array.isArray(emails) || emails.length === 0) {
                throw new errorHandler_1.AppError(400, 'Please provide at least one email address');
            }
            if (!role) {
                throw new errorHandler_1.AppError(400, 'Please specify a role for the invitees');
            }
            // Validate role
            const validRoles = ['member', 'co-owner', 'readonly'];
            if (!validRoles.includes(role)) {
                throw new errorHandler_1.AppError(400, 'Invalid role specified');
            }
            // Get the space to check permissions
            const space = await space_service_1.SpaceService.getSpace(spaceId);
            if (!space.owner || !space.members) {
                throw new errorHandler_1.AppError(404, 'Space data is incomplete');
            }
            // Check if the current user has permission to invite members
            const currentUserId = req.user.id;
            const isOwnerOrCoOwner = space.owner.id === currentUserId ||
                space.members.some(m => {
                    var _a;
                    const memberRole = (_a = m.SpaceMember) === null || _a === void 0 ? void 0 : _a.role;
                    return m.id === currentUserId && memberRole === 'co-owner';
                });
            if (!isOwnerOrCoOwner) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to invite members');
            }
            // Send invitations
            const invitationResults = await space_service_1.SpaceService.inviteMembers(spaceId, {
                emails,
                role,
                message,
                inviterId: currentUserId
            });
            res.status(200).json({
                message: 'Invitations sent successfully',
                results: invitationResults
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateMemberRole(req, res, next) {
        try {
            const { id: spaceId, userId } = req.params;
            const { role } = req.body;
            if (!req.user) {
                throw new errorHandler_1.AppError(401, 'Unauthorized');
            }
            if (!role) {
                throw new errorHandler_1.AppError(400, 'Role is required');
            }
            // Validate role
            const validRoles = ['member', 'co-owner', 'readonly'];
            if (!validRoles.includes(role)) {
                throw new errorHandler_1.AppError(400, 'Invalid role specified');
            }
            // Get the space to check permissions
            const space = await space_service_1.SpaceService.getSpace(spaceId);
            if (!space.owner || !space.members) {
                throw new errorHandler_1.AppError(404, 'Space data is incomplete');
            }
            // Check if the current user has permission to update roles
            const currentUserId = req.user.id;
            const isOwnerOrCoOwner = space.owner.id === currentUserId ||
                space.members.some(m => {
                    var _a;
                    const memberRole = (_a = m.SpaceMember) === null || _a === void 0 ? void 0 : _a.role;
                    return m.id === currentUserId && memberRole === 'co-owner';
                });
            if (!isOwnerOrCoOwner) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to update member roles');
            }
            // Update the member's role
            await space_service_1.SpaceService.updateMemberRole(spaceId, userId, role);
            res.status(200).json({ message: 'Member role updated successfully' });
        }
        catch (error) {
            next(error);
        }
    }
    static async getCabinets(req, res, next) {
        try {
            const spaceId = req.params.id;
            if (!spaceId || typeof spaceId !== 'string') {
                throw new errorHandler_1.AppError(400, 'Space ID is required');
            }
            const cabinets = await cabinet_service_1.CabinetService.getApprovedCabinets(spaceId);
            res.json(cabinets);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.SpaceController = SpaceController;
