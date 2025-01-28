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
}
exports.CabinetController = CabinetController;
