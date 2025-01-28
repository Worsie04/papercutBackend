"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpaceController = void 0;
const space_service_1 = require("../../services/space.service");
const errorHandler_1 = require("../middlewares/errorHandler");
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
}
exports.SpaceController = SpaceController;
