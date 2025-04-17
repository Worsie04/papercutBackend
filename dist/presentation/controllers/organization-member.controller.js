"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationMemberController = void 0;
const organization_member_service_1 = require("../../services/organization-member.service");
const organization_service_1 = require("../../services/organization.service");
const errorHandler_1 = require("../middlewares/errorHandler");
const user_model_1 = require("../../models/user.model");
const organization_member_model_1 = require("../../models/organization-member.model");
class OrganizationMemberController {
    static async addMember(req, res, next) {
        var _a;
        try {
            const { organizationId } = req.params;
            const { email, firstName, lastName, password, role, customPermissions } = req.body;
            let invitedBy = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            // Check if the organization exists
            await organization_service_1.OrganizationService.getOrganization(organizationId);
            // Verify invitedBy user exists if provided
            if (invitedBy) {
                const inviter = await user_model_1.User.findByPk(invitedBy);
                if (!inviter) {
                    invitedBy = undefined; // Reset if user not found
                }
            }
            // Add the member
            const member = await organization_member_service_1.OrganizationMemberService.addMember(organizationId, { email, firstName, lastName, password, role, customPermissions, invitedBy });
            res.status(201).json(member);
        }
        catch (error) {
            next(error);
        }
    }
    static async updateMember(req, res, next) {
        try {
            const { organizationId, userId } = req.params;
            const { role, customPermissions, status, firstName, lastName } = req.body;
            // Check if the organization exists
            await organization_service_1.OrganizationService.getOrganization(organizationId);
            // console.log(userId);
            // console.log(organizationId);
            // console.log(role);
            // console.log(customPermissions);
            // console.log(status);
            // console.log(firstName);
            // console.log(lastName);
            // First, find the member to get the associated user
            const member = await organization_member_model_1.OrganizationMember.findOne({
                where: {
                    organizationId,
                    id: userId,
                },
                include: [
                    {
                        model: user_model_1.User,
                        as: 'user',
                        attributes: ['id', 'firstName', 'lastName', 'email']
                    }
                ]
            });
            if (!member) {
                throw new errorHandler_1.AppError(404, 'Member not found in the organization');
            }
            // If firstName or lastName is provided, update the user information
            if (firstName || lastName) {
                await user_model_1.User.update({
                    firstName: firstName || member.user.firstName,
                    lastName: lastName || member.user.lastName
                }, {
                    where: { id: member.user.id }
                });
            }
            // Update the member
            const updatedMember = await organization_member_service_1.OrganizationMemberService.updateMember(organizationId, userId, { role, customPermissions, status });
            // Fetch the updated member with fresh user data
            const refreshedMember = await organization_member_model_1.OrganizationMember.findByPk(updatedMember.id, {
                include: [
                    {
                        model: user_model_1.User,
                        as: 'user',
                        attributes: ['id', 'firstName', 'lastName', 'email']
                    }
                ]
            });
            res.json(refreshedMember);
        }
        catch (error) {
            next(error);
        }
    }
    static async removeMember(req, res, next) {
        try {
            const { organizationId, userId } = req.params;
            // Check if the organization exists
            await organization_service_1.OrganizationService.getOrganization(organizationId);
            // Remove the member
            await organization_member_service_1.OrganizationMemberService.removeMember(organizationId, userId);
            res.status(204).send();
        }
        catch (error) {
            next(error);
        }
    }
    static async getOrganizationMembers(req, res, next) {
        try {
            const { organizationId } = req.params;
            const { role, status, search } = req.query;
            // Check if the organization exists
            await organization_service_1.OrganizationService.getOrganization(organizationId);
            // Get members
            const members = await organization_member_service_1.OrganizationMemberService.getOrganizationMembers(organizationId, {
                role: role,
                status: status,
                search: search
            });
            res.json(members);
        }
        catch (error) {
            next(error);
        }
    }
    static async transferOwnership(req, res, next) {
        try {
            const { organizationId } = req.params;
            const { newOwnerId } = req.body;
            // Check if the organization exists
            await organization_service_1.OrganizationService.getOrganization(organizationId);
            // Transfer ownership
            const result = await organization_member_service_1.OrganizationMemberService.transferOwnership(organizationId, newOwnerId);
            res.json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async checkMemberPermissions(req, res, next) {
        try {
            const { organizationId, userId } = req.params;
            const { permissions } = req.body;
            // Get the organization
            const organization = await organization_service_1.OrganizationService.getOrganization(organizationId);
            // Check permissions
            const permissionResults = await Promise.all(permissions.map(async (permission) => ({
                permission,
                hasPermission: await organization.hasPermission(userId, permission)
            })));
            res.json(permissionResults);
        }
        catch (error) {
            next(error);
        }
    }
    static async getUserOrganization(req, res, next) {
        try {
            const { userId } = req.params;
            const member = await organization_member_model_1.OrganizationMember.findOne({
                where: { userId },
                attributes: ['organizationId', 'role', 'customPermissions'],
                include: [
                    {
                        model: user_model_1.User,
                        as: 'user',
                        attributes: ['id', 'firstName', 'lastName', 'email']
                    }
                ]
            });
            if (!member) {
                throw new errorHandler_1.AppError(404, 'User is not a member of any organization');
            }
            res.json(member);
        }
        catch (error) {
            next(error);
        }
    }
    static async getOrganizationUsers(req, res, next) {
        try {
            const { organizationId } = req.params;
            const members = await organization_member_model_1.OrganizationMember.findAll({
                where: { organizationId },
                include: [
                    {
                        model: user_model_1.User,
                        as: 'user',
                        attributes: ['id', 'firstName', 'lastName', 'email', 'isActive', 'avatar'],
                    }
                ]
            });
            // Transform the data to include user details and member role
            const users = members.map(member => ({
                id: member.user.id,
                firstName: member.user.firstName,
                lastName: member.user.lastName,
                email: member.user.email,
                isActive: member.user.isActive,
                avatar: member.user.avatar,
                role: member.role,
                organizationRole: member.role,
                permissions: member.customPermissions
            }));
            res.json({
                users,
                total: users.length,
                page: 1,
                totalPages: 1
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.OrganizationMemberController = OrganizationMemberController;
