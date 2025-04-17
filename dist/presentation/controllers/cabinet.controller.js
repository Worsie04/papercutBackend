"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CabinetController = void 0;
const cabinet_service_1 = require("../../services/cabinet.service");
const errorHandler_1 = require("../middlewares/errorHandler");
const cabinet_model_1 = require("../../models/cabinet.model");
const cabinet_member_permission_model_1 = require("../../models/cabinet-member-permission.model");
const record_model_1 = require("../../models/record.model");
const organization_member_model_1 = require("../../models/organization-member.model");
const sequelize_1 = require("sequelize");
class CabinetController {
    static async createCabinet(req, res, next) {
        var _b;
        try {
            const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
            if (!userId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }
            const body = Object.assign(Object.assign({}, req.body), { createdById: userId, tags: Array.isArray(req.body.tags) ? req.body.tags : JSON.parse(req.body.tags || '[]'), members: Array.isArray(req.body.members) ? req.body.members : JSON.parse(req.body.members || '[]'), approvers: Array.isArray(req.body.approvers) ? req.body.approvers : JSON.parse(req.body.approvers || '[]'), customFields: Array.isArray(req.body.customFields) ? req.body.customFields : JSON.parse(req.body.customFields || '[]') });
            const cabinet = await cabinet_service_1.CabinetService.createCabinet(body);
            res.status(201).json(cabinet);
        }
        catch (error) {
            next(error);
        }
    }
    static async getCabinet(req, res, next) {
        try {
            const { id } = req.params;
            const cabinet = await cabinet_service_1.CabinetService.getCabinet(id);
            res.json(cabinet);
        }
        catch (error) {
            next(error);
        }
    }
    static async getCabinets(req, res, next) {
        try {
            const { spaceId } = req.query;
            if (!spaceId || typeof spaceId !== 'string') {
                throw new errorHandler_1.AppError(400, 'Space ID is required');
            }
            const cabinets = await cabinet_service_1.CabinetService.getCabinets(spaceId);
            res.json(cabinets);
        }
        catch (error) {
            next(error);
        }
    }
    static async getApprovedCabinets(req, res, next) {
        try {
            const { spaceId } = req.query;
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
    static async updateCabinet(req, res, next) {
        var _b;
        try {
            const { id } = req.params;
            const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
            if (!userId) {
                throw new errorHandler_1.AppError(401, 'User not authenticated');
            }
            const cabinet = await cabinet_service_1.CabinetService.updateCabinet(id, req.body, userId);
            res.json(cabinet);
        }
        catch (error) {
            next(error);
        }
    }
    static async approveCabinet(req, res, next) {
        var _b;
        try {
            const { id } = req.params;
            const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
            if (!userId) {
                throw new errorHandler_1.AppError(401, 'User not authenticated');
            }
            const cabinet = await cabinet_service_1.CabinetService.approveCabinet(id, userId, req.body.note, req.body, req.body.comments);
            res.json(cabinet);
        }
        catch (error) {
            next(error);
        }
    }
    static async rejectCabinet(req, res, next) {
        var _b;
        try {
            const { id } = req.params;
            const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
            const _c = req.body, { reason, note, comments } = _c, updatedData = __rest(_c, ["reason", "note", "comments"]);
            if (!userId) {
                throw new errorHandler_1.AppError(401, 'User not authenticated');
            }
            const cabinet = await cabinet_service_1.CabinetService.rejectCabinet(id, userId, reason, note, comments, updatedData);
            res.json(cabinet);
        }
        catch (error) {
            next(error);
        }
    }
    static async reassignCabinet(req, res, next) {
        var _b;
        try {
            const { id } = req.params;
            const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
            const { approverId, note } = req.body;
            if (!userId) {
                throw new errorHandler_1.AppError(401, 'User not authenticated');
            }
            const cabinet = await cabinet_service_1.CabinetService.reassignCabinet(id, userId, approverId, note);
            res.json(cabinet);
        }
        catch (error) {
            next(error);
        }
    }
    static async assignCabinetsToUsers(req, res, next) {
        try {
            const { userIds, cabinetIds, spaceId } = req.body;
            if (!Array.isArray(userIds) || userIds.length === 0) {
                throw new errorHandler_1.AppError(400, 'At least one user ID is required');
            }
            if (!Array.isArray(cabinetIds) || cabinetIds.length === 0) {
                throw new errorHandler_1.AppError(400, 'At least one cabinet ID is required');
            }
            if (!spaceId) {
                throw new errorHandler_1.AppError(400, 'Space ID is required');
            }
            await cabinet_service_1.CabinetService.assignCabinetsToUsers(userIds, cabinetIds, spaceId);
            res.status(200).json({
                message: 'Cabinets assigned successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async assignUsersWithPermissions(req, res, next) {
        try {
            const { assignments, spaceId } = req.body;
            if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
                throw new errorHandler_1.AppError(400, 'Invalid assignments data');
            }
            if (!spaceId) {
                throw new errorHandler_1.AppError(400, 'Space ID is required');
            }
            // Validate each assignment
            assignments.forEach(assignment => {
                if (!assignment.userId || !assignment.cabinetId || !assignment.role || !assignment.permissions) {
                    throw new errorHandler_1.AppError(400, 'Invalid assignment data');
                }
                const requiredPermissions = [
                    'readRecords',
                    'createRecords',
                    'updateRecords',
                    'deleteRecords',
                    'manageCabinet',
                    'downloadFiles',
                    'exportTables'
                ];
                requiredPermissions.forEach(perm => {
                    if (typeof assignment.permissions[perm] !== 'boolean') {
                        throw new errorHandler_1.AppError(400, `Invalid permission value for ${perm}`);
                    }
                });
            });
            await cabinet_service_1.CabinetService.assignUsersWithPermissions(assignments, spaceId);
            res.status(200).json({
                message: 'Users assigned to cabinets with permissions successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getMyCabinetsByStatus(req, res, next) {
        var _b;
        try {
            const { status } = req.query;
            const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
            if (!status || typeof status !== 'string') {
                throw new errorHandler_1.AppError(400, 'Status parameter is required');
            }
            if (!userId) {
                throw new errorHandler_1.AppError(401, 'Unauthorized');
            }
            const validStatuses = ['pending', 'approved', 'rejected'];
            if (!validStatuses.includes(status)) {
                throw new errorHandler_1.AppError(400, 'Invalid status. Must be one of: pending, approved, rejected');
            }
            const cabinets = await cabinet_service_1.CabinetService.getMyPendingApprovals(userId, status);
            res.json(cabinets);
        }
        catch (error) {
            next(error);
        }
    }
    static async getCabinetsWaitingForMyApproval(req, res, next) {
        var _b;
        try {
            const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
            if (!userId) {
                throw new errorHandler_1.AppError(401, 'Unauthorized');
            }
            // Get cabinets waiting for this user's approval
            const cabinets = await cabinet_service_1.CabinetService.getApprovalsWaitingFor(userId);
            res.json(cabinets);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.CabinetController = CabinetController;
_a = CabinetController;
CabinetController.deleteCabinet = async (req, res) => {
    var _b;
    try {
        const { id } = req.params;
        const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
        // Debug log to see what's in the user object
        //console.log('User object:', req.user);
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized - User not authenticated' });
            return;
        }
        // First check if the cabinet exists
        const cabinet = await cabinet_model_1.Cabinet.findByPk(id);
        if (!cabinet) {
            res.status(404).json({ error: 'Cabinet not found' });
            return;
        }
        // Check if user is the owner of the cabinet
        const isOwner = cabinet.createdById === userId;
        // Find the user's organization role from organization_members table
        const orgMember = await organization_member_model_1.OrganizationMember.findOne({
            where: {
                userId: userId,
                status: 'active'
            },
            attributes: ['role']
        });
        //console.log('Organization member role:', orgMember?.role);
        // Check if user is a super_user or admin (who can delete any cabinet)
        const isSuperUser = (orgMember === null || orgMember === void 0 ? void 0 : orgMember.role) === 'super_user' ||
            (orgMember === null || orgMember === void 0 ? void 0 : orgMember.role) === 'system_admin' ||
            (orgMember === null || orgMember === void 0 ? void 0 : orgMember.role) === 'owner' ||
            (orgMember === null || orgMember === void 0 ? void 0 : orgMember.role) === 'co_owner';
        if (!isOwner && !isSuperUser) {
            // If not owner or super_user, check if user has delete permissions for this cabinet
            const { fn, col, where } = require('sequelize');
            const memberPermission = await cabinet_member_permission_model_1.CabinetMemberPermission.findOne({
                where: {
                    cabinetId: id,
                    userId: userId,
                    [sequelize_1.Op.and]: [
                        where(fn('JSONB_EXTRACT_PATH_TEXT', col('permissions'), 'deleteRecords'), 'true')
                    ]
                }
            });
            if (!memberPermission) {
                res.status(403).json({ error: 'You do not have permission to delete this cabinet' });
                return;
            }
        }
        // Delete associated records directly by cabinetId
        await record_model_1.Record.destroy({
            where: { cabinetId: id }
        });
        // Delete the cabinet directly by ID
        await cabinet_model_1.Cabinet.destroy({
            where: { id }
        });
        res.status(200).json({ message: 'Cabinet deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting cabinet:', error);
        res.status(500).json({ error: 'An error occurred while deleting the cabinet' });
    }
};
