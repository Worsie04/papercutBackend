"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationController = void 0;
const organization_service_1 = require("../../services/organization.service");
const errorHandler_1 = require("../middlewares/errorHandler");
class OrganizationController {
    static async createOrganization(req, res, next) {
        var _a, _b;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            const userType = (_b = req.user) === null || _b === void 0 ? void 0 : _b.type;
            if (!userId || !userType) {
                throw new errorHandler_1.AppError(401, 'Unauthorized');
            }
            const organization = await organization_service_1.OrganizationService.createOrganization(Object.assign(Object.assign({}, req.body), { ownerId: userId, ownerType: userType === 'admin' ? 'admin' : 'user' }));
            res.status(201).json(organization);
        }
        catch (error) {
            next(error);
        }
    }
    static async getOrganizations(req, res, next) {
        try {
            const organizations = await organization_service_1.OrganizationService.getOrganizations();
            res.json(organizations);
        }
        catch (error) {
            next(error);
        }
    }
    static async getOrganization(req, res, next) {
        try {
            const { id } = req.params;
            const organization = await organization_service_1.OrganizationService.getOrganization(id);
            // Transform the response to use a consistent owner structure
            const transformedOrganization = Object.assign(Object.assign({}, organization.toJSON()), { owner: organization.getOwner() });
            res.json(transformedOrganization);
        }
        catch (error) {
            next(error);
        }
    }
    static async updateOrganization(req, res, next) {
        var _a, _b;
        try {
            const { id } = req.params;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            const userType = (_b = req.user) === null || _b === void 0 ? void 0 : _b.type;
            if (!userId || !userType) {
                throw new errorHandler_1.AppError(401, 'Unauthorized');
            }
            // Get the organization to check ownership
            const organization = await organization_service_1.OrganizationService.getOrganization(id);
            if (organization.owner_id !== userId || organization.owner_type !== (userType === 'admin' ? 'admin' : 'user')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to update this organization');
            }
            const updatedOrganization = await organization_service_1.OrganizationService.updateOrganization(id, req.body);
            // Transform the response to use a consistent owner structure
            const transformedOrganization = Object.assign(Object.assign({}, updatedOrganization.toJSON()), { owner: updatedOrganization.getOwner() });
            res.json(transformedOrganization);
        }
        catch (error) {
            next(error);
        }
    }
    static async deleteOrganization(req, res, next) {
        var _a, _b;
        try {
            const { id } = req.params;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            const userType = (_b = req.user) === null || _b === void 0 ? void 0 : _b.type;
            if (!userId || !userType) {
                throw new errorHandler_1.AppError(401, 'Unauthorized');
            }
            // Get the organization to check ownership
            const organization = await organization_service_1.OrganizationService.getOrganization(id);
            if (organization.owner_id !== userId || organization.owner_type !== (userType === 'admin' ? 'admin' : 'user')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to delete this organization');
            }
            await organization_service_1.OrganizationService.deleteOrganization(id);
            res.status(204).send();
        }
        catch (error) {
            next(error);
        }
    }
    static async getUserOrganizations(req, res, next) {
        var _a, _b;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            const userType = (_b = req.user) === null || _b === void 0 ? void 0 : _b.type;
            if (!userId || !userType) {
                throw new errorHandler_1.AppError(401, 'Unauthorized');
            }
            const organizations = await organization_service_1.OrganizationService.getOrganizationsByOwner(userId, userType === 'admin' ? 'admin' : 'user');
            const transformedOrganizations = organizations.map(org => (Object.assign(Object.assign({}, org.toJSON()), { owner: org.getOwner() })));
            // console.log(transformedOrganizations);
            res.json(transformedOrganizations);
        }
        catch (error) {
            next(error);
        }
    }
    static async findDomainByUserId(req, res, next) {
        try {
            const { userId } = req.params;
            const domain = await organization_service_1.OrganizationService.findDomainByUserId(userId);
            res.json(domain);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.OrganizationController = OrganizationController;
