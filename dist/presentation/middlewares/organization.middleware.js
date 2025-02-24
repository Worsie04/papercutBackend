"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkOrganizationPermissions = checkOrganizationPermissions;
exports.checkOrganizationOwnership = checkOrganizationOwnership;
const organization_service_1 = require("../../services/organization.service");
const organization_member_service_1 = require("../../services/organization-member.service");
const errorHandler_1 = require("./errorHandler");
async function checkOrganizationPermissions(req, res, next) {
    var _a, _b, _c;
    try {
        const { organizationId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const userType = (_b = req.user) === null || _b === void 0 ? void 0 : _b.type;
        if (!userId || !userType) {
            throw new errorHandler_1.AppError(401, 'Unauthorized');
        }
        // Super admins can access all organizations
        if (userType === 'super_admin') {
            return next();
        }
        // Get the organization
        const organization = await organization_service_1.OrganizationService.getOrganization(organizationId);
        // Check if user is the owner of the organization
        if (organization.owner_id === userId && organization.owner_type === userType) {
            return next();
        }
        // For regular users and admins, check organization membership
        const member = await organization_member_service_1.OrganizationMemberService.getOrganizationMembers(organizationId, {
            role: undefined,
            status: 'active'
        });
        const userMember = member.find(m => m.userId === userId);
        if (!userMember) {
            throw new errorHandler_1.AppError(403, 'You do not have access to this organization');
        }
        // Check specific permissions based on the request method
        switch (req.method) {
            case 'GET':
                // All active members can view
                return next();
            case 'POST':
            case 'PATCH':
            case 'PUT':
                // Only owners, co-owners, system admins, and super users can modify
                if (userMember.role === 'owner' ||
                    userMember.role === 'co_owner' ||
                    userMember.role === 'system_admin' ||
                    userMember.role === 'super_user' ||
                    (userMember.role === 'member_full' &&
                        ((_c = userMember.customPermissions) === null || _c === void 0 ? void 0 : _c.canManageRoles))) {
                    return next();
                }
                break;
            case 'DELETE':
                // Only owners and system admins can delete
                if (userMember.role === 'owner' ||
                    userMember.role === 'system_admin' ||
                    userMember.role === 'super_user') {
                    return next();
                }
                break;
        }
        throw new errorHandler_1.AppError(403, 'You do not have permission to perform this action');
    }
    catch (error) {
        next(error);
    }
}
async function checkOrganizationOwnership(req, res, next) {
    var _a, _b;
    try {
        const { organizationId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const userType = (_b = req.user) === null || _b === void 0 ? void 0 : _b.type;
        if (!userId || !userType) {
            throw new errorHandler_1.AppError(401, 'Unauthorized');
        }
        // Super admins can access all organizations
        if (userType === 'super_admin') {
            return next();
        }
        // Get the organization
        const organization = await organization_service_1.OrganizationService.getOrganization(organizationId);
        // Check if user is the owner
        if (organization.owner_id === userId && organization.owner_type === userType) {
            return next();
        }
        throw new errorHandler_1.AppError(403, 'Only organization owners can perform this action');
    }
    catch (error) {
        next(error);
    }
}
