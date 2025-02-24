"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupController = void 0;
const group_service_1 = require("../../services/group.service");
const errorHandler_1 = require("../middlewares/errorHandler");
const group_model_1 = require("../../models/group.model");
class GroupController {
    static async createGroup(req, res, next) {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                throw new errorHandler_1.AppError(401, 'User not authenticated');
            }
            const { name, description, organizationId } = req.body;
            const group = await group_service_1.GroupService.createGroup({
                name,
                description,
                organizationId,
                createdBy: userId
            });
            res.status(201).json(group);
        }
        catch (error) {
            next(error);
        }
    }
    static async getGroups(req, res, next) {
        try {
            const { organizationId } = req.params;
            if (!organizationId) {
                throw new errorHandler_1.AppError(400, 'Organization ID is required');
            }
            const groups = await group_service_1.GroupService.getGroups(organizationId);
            res.json(groups);
        }
        catch (error) {
            next(error);
        }
    }
    static async getGroupById(req, res, next) {
        try {
            const { id } = req.params;
            const group = await group_service_1.GroupService.getGroupById(id);
            if (!group) {
                throw new errorHandler_1.AppError(404, 'Group not found');
            }
            res.json(group);
        }
        catch (error) {
            next(error);
        }
    }
    static async updateGroup(req, res, next) {
        try {
            const { id } = req.params;
            const { name, description } = req.body;
            const group = await group_service_1.GroupService.updateGroup(id, {
                name,
                description
            });
            res.json(group);
        }
        catch (error) {
            next(error);
        }
    }
    static async deleteGroup(req, res, next) {
        try {
            const { id } = req.params;
            await group_service_1.GroupService.deleteGroup(id);
            res.status(204).send();
        }
        catch (error) {
            next(error);
        }
    }
    static async addUsersToGroup(req, res, next) {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                throw new errorHandler_1.AppError(401, 'User not authenticated');
            }
            // Handle both /assign and /:groupId/members formats
            const { groupId } = req.params;
            const { userIds, groupIds } = req.body;
            if (groupId) {
                // Single group format (/:groupId/members)
                const updatedGroup = await group_service_1.GroupService.addUsersToGroup(groupId, userIds, userId);
                res.json(updatedGroup);
            }
            else if (groupIds && Array.isArray(groupIds)) {
                // Multiple groups format (/assign)
                const results = await Promise.all(groupIds.map(gId => group_service_1.GroupService.addUsersToGroup(gId, userIds, userId)));
                res.json(results);
            }
            else {
                throw new errorHandler_1.AppError(400, 'Either groupId parameter or groupIds in body is required');
            }
        }
        catch (error) {
            next(error);
        }
    }
    static async removeUsersFromGroup(req, res, next) {
        try {
            const { groupId } = req.params;
            const { userIds } = req.body;
            const updatedGroup = await group_service_1.GroupService.removeUsersFromGroup(groupId, userIds);
            res.json(updatedGroup);
        }
        catch (error) {
            next(error);
        }
    }
    static async updatePermissions(req, res, next) {
        try {
            const { id } = req.params;
            const { permissions } = req.body;
            // Validate permissions object
            if (!permissions || typeof permissions !== 'object') {
                throw new errorHandler_1.AppError(400, 'Invalid permissions format');
            }
            const requiredPermissions = ['readRecords', 'manageCabinet', 'downloadFiles', 'exportTables'];
            for (const perm of requiredPermissions) {
                if (typeof permissions[perm] !== 'boolean') {
                    throw new errorHandler_1.AppError(400, `Invalid permission value for ${perm}`);
                }
            }
            // Find the group
            const group = await group_model_1.Group.findByPk(id);
            if (!group) {
                throw new errorHandler_1.AppError(404, 'Group not found');
            }
            // Update permissions
            await group.update({ permissions });
            res.status(200).json({
                message: 'Group permissions updated successfully',
                group,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.GroupController = GroupController;
