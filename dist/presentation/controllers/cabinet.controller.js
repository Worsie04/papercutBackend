"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CabinetController = void 0;
const cabinet_service_1 = require("../../services/cabinet.service");
const errorHandler_1 = require("../middlewares/errorHandler");
class CabinetController {
    static async createCabinet(req, res, next) {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
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
            console.log(cabinet);
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
    static async approveCabinet(req, res, next) {
        var _a;
        try {
            const { id } = req.params;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                throw new errorHandler_1.AppError(401, 'User not authenticated');
            }
            const cabinet = await cabinet_service_1.CabinetService.approveCabinet(id, userId);
            res.json(cabinet);
        }
        catch (error) {
            next(error);
        }
    }
    static async rejectCabinet(req, res, next) {
        var _a;
        try {
            const { id } = req.params;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            const { reason } = req.body;
            if (!userId) {
                throw new errorHandler_1.AppError(401, 'User not authenticated');
            }
            const cabinet = await cabinet_service_1.CabinetService.rejectCabinet(id, userId, reason);
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
}
exports.CabinetController = CabinetController;
