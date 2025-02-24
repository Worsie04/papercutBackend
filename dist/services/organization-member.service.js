"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationMemberService = void 0;
const organization_member_model_1 = require("../models/organization-member.model");
const organization_model_1 = require("../models/organization.model");
const user_model_1 = require("../models/user.model");
const errorHandler_1 = require("../presentation/middlewares/errorHandler");
const sequelize_1 = require("sequelize");
// Define role hierarchy and permissions
const ROLE_HIERARCHY = {
    system_admin: 100,
    owner: 90,
    co_owner: 80,
    super_user: 70,
    member_full: 50,
    member_read: 30,
    guest: 10
};
// Helper function to check if a role has higher or equal privileges
const hasHigherOrEqualPrivilege = (role1, role2) => {
    return (ROLE_HIERARCHY[role1] || 0) >= (ROLE_HIERARCHY[role2] || 0);
};
// Helper function to get default permissions based on role
const getDefaultPermissions = (role) => {
    switch (role) {
        case 'system_admin':
        case 'owner':
        case 'co_owner':
        case 'super_user':
            return {
                canCreateSpaces: true,
                canApproveSpaces: true,
                canInviteMembers: true,
                canManageRoles: true,
                canDownloadFiles: true,
                canEditFields: ['*'],
                restrictedFields: []
            };
        case 'member_full':
            return {
                canCreateSpaces: true,
                canApproveSpaces: false,
                canInviteMembers: true,
                canManageRoles: false,
                canDownloadFiles: true,
                canEditFields: ['*'],
                restrictedFields: []
            };
        case 'member_read':
            return {
                canCreateSpaces: false,
                canApproveSpaces: false,
                canInviteMembers: false,
                canManageRoles: false,
                canDownloadFiles: true,
                canEditFields: [],
                restrictedFields: ['*']
            };
        case 'guest':
            return {
                canCreateSpaces: false,
                canApproveSpaces: false,
                canInviteMembers: false,
                canManageRoles: false,
                canDownloadFiles: false,
                canEditFields: [],
                restrictedFields: ['*']
            };
        default:
            return {
                canCreateSpaces: false,
                canApproveSpaces: false,
                canInviteMembers: false,
                canManageRoles: false,
                canDownloadFiles: false,
                canEditFields: [],
                restrictedFields: ['*']
            };
    }
};
class OrganizationMemberService {
    static async addMember(organizationId, data) {
        // Get the organization to check domain
        const organization = await organization_model_1.Organization.findByPk(organizationId);
        if (!organization) {
            throw new errorHandler_1.AppError(404, 'Organization not found');
        }
        // Extract domain from email
        const emailDomain = data.email.split('@')[1];
        // Always validate domain for all roles
        if (emailDomain !== organization.domain) {
            throw new errorHandler_1.AppError(400, `Only users with @${organization.domain} email addresses can be added to this organization`);
        }
        // First try to find the user by email
        let user = await user_model_1.User.findOne({
            where: { email: data.email }
        });
        let userId;
        let userType = data.role === 'super_admin' ? 'admin' : 'user';
        // If user doesn't exist, create a new one
        if (!user) {
            user = await user_model_1.User.create({
                email: data.email,
                firstName: data.firstName || data.email.split('@')[0], // Default to email prefix if not provided
                lastName: data.lastName || '', // Default to empty string if not provided
                isActive: true,
                emailVerifiedAt: new Date(),
                password: data.password || Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12)
            });
            userId = user.id;
        }
        else {
            // If user exists and firstName/lastName are provided, update them
            if (data.firstName || data.lastName) {
                await user.update({
                    firstName: data.firstName || user.firstName,
                    lastName: data.lastName || user.lastName
                });
            }
            userId = user.id;
        }
        // Check if the user is already a member
        const existingMember = await organization_member_model_1.OrganizationMember.findOne({
            where: {
                organizationId,
                userId,
            }
        });
        if (existingMember) {
            throw new errorHandler_1.AppError(400, 'User is already a member of this organization');
        }
        // Set default permissions based on role
        const permissions = data.customPermissions || getDefaultPermissions(data.role);
        // Create the member
        const member = await organization_member_model_1.OrganizationMember.create({
            organizationId,
            userId,
            userType,
            role: data.role,
            customPermissions: permissions,
            invitedBy: data.invitedBy || null,
            status: 'active'
        });
        return this.getMember(member.id);
    }
    static async updateMember(organizationId, userId, updates) {
        console.log(userId);
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
            throw new errorHandler_1.AppError(404, 'Member not found in the organization or is suspended');
        }
        // Prevent updating roles with higher privileges
        if (updates.role && !hasHigherOrEqualPrivilege(member.role, updates.role)) {
            throw new errorHandler_1.AppError(403, 'Cannot assign a role with higher privileges than your own');
        }
        // If role is being updated, set default permissions unless custom ones are provided
        if (updates.role && !updates.customPermissions) {
            updates.customPermissions = getDefaultPermissions(updates.role);
        }
        // Update user type if role changes to/from system_admin
        if (updates.role) {
            const userType = updates.role === 'super_admin' ? 'admin' : 'user';
            await member.update(Object.assign(Object.assign({}, updates), { userType }));
        }
        else {
            await member.update(updates);
        }
        return this.getMember(member.id);
    }
    static async removeMember(organizationId, userId) {
        const member = await organization_member_model_1.OrganizationMember.findOne({
            where: {
                organizationId,
                id: userId
            },
            include: [
                {
                    model: user_model_1.User,
                    as: 'user',
                    attributes: ['id', 'first_name', 'last_name', 'email']
                }
            ]
        });
        if (!member) {
            throw new errorHandler_1.AppError(404, 'Member not found');
        }
        // Prevent removing the owner
        if (member.role === 'owner') {
            throw new errorHandler_1.AppError(403, 'Cannot remove the organization owner');
        }
        await member.destroy();
    }
    static async getMember(id) {
        const member = await organization_member_model_1.OrganizationMember.findByPk(id, {
            include: [
                {
                    model: user_model_1.User,
                    as: 'user',
                    attributes: ['id', 'first_name', 'last_name', 'email']
                },
                {
                    model: organization_model_1.Organization,
                    as: 'organization',
                    attributes: ['id', 'name', 'type']
                },
                {
                    model: user_model_1.User,
                    as: 'inviter',
                    attributes: ['id', 'first_name', 'last_name', 'email']
                }
            ]
        });
        if (!member) {
            throw new errorHandler_1.AppError(404, 'Member not found');
        }
        return member;
    }
    static async getOrganizationMembers(organizationId, query) {
        const where = {
            organizationId
        };
        if (query === null || query === void 0 ? void 0 : query.role) {
            where.role = query.role;
        }
        if (query === null || query === void 0 ? void 0 : query.status) {
            where.status = query.status;
        }
        const members = await organization_member_model_1.OrganizationMember.findAll({
            where,
            include: [
                {
                    model: user_model_1.User,
                    as: 'user',
                    attributes: ['id', 'first_name', 'last_name', 'email'],
                    where: (query === null || query === void 0 ? void 0 : query.search) ? {
                        [sequelize_1.Op.or]: [
                            { first_name: { [sequelize_1.Op.iLike]: `%${query.search}%` } },
                            { last_name: { [sequelize_1.Op.iLike]: `%${query.search}%` } },
                            { email: { [sequelize_1.Op.iLike]: `%${query.search}%` } }
                        ]
                    } : undefined
                },
                {
                    model: user_model_1.User,
                    as: 'inviter',
                    attributes: ['id', 'first_name', 'last_name', 'email']
                }
            ],
            order: [['createdAt', 'DESC']]
        });
        return members;
    }
    static async transferOwnership(organizationId, newOwnerId) {
        // Get current owner
        const currentOwner = await organization_member_model_1.OrganizationMember.findOne({
            where: {
                organizationId,
                role: 'owner'
            },
            include: [
                {
                    model: user_model_1.User,
                    as: 'user',
                    attributes: ['id', 'first_name', 'last_name', 'email']
                }
            ]
        });
        if (!currentOwner) {
            throw new errorHandler_1.AppError(404, 'Current owner not found');
        }
        // Get new owner
        const newOwner = await organization_member_model_1.OrganizationMember.findOne({
            where: {
                organizationId,
                userId: newOwnerId
            },
            include: [
                {
                    model: user_model_1.User,
                    as: 'user',
                    attributes: ['id', 'first_name', 'last_name', 'email']
                }
            ]
        });
        if (!newOwner) {
            throw new errorHandler_1.AppError(404, 'New owner not found in organization members');
        }
        // Start transaction
        const t = await organization_member_model_1.OrganizationMember.sequelize.transaction();
        try {
            // Update current owner to admin
            await currentOwner.update({
                role: 'admin'
            }, { transaction: t });
            // Update new owner
            await newOwner.update({
                role: 'owner'
            }, { transaction: t });
            await t.commit();
        }
        catch (error) {
            await t.rollback();
            throw error;
        }
        return {
            previousOwner: await this.getMember(currentOwner.id),
            newOwner: await this.getMember(newOwner.id)
        };
    }
}
exports.OrganizationMemberService = OrganizationMemberService;
