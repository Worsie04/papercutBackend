"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationService = void 0;
const organization_model_1 = require("../models/organization.model");
const user_model_1 = require("../models/user.model");
const admin_model_1 = require("../models/admin.model");
const errorHandler_1 = require("../presentation/middlewares/errorHandler");
const sequelize_1 = require("sequelize");
const organization_member_service_1 = require("./organization-member.service");
class OrganizationService {
    static async createOrganization(data) {
        // Validate domain format
        const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/i;
        if (!domainRegex.test(data.domain)) {
            throw new errorHandler_1.AppError(400, 'Invalid domain format. Please enter a valid domain (e.g., example.com)');
        }
        // Check if domain is already in use
        const existingOrg = await organization_model_1.Organization.findOne({
            where: { domain: data.domain }
        });
        if (existingOrg) {
            throw new errorHandler_1.AppError(400, 'This domain is already registered with another organization');
        }
        // Get owner details to validate email domain
        const owner = data.ownerType === 'user'
            ? await user_model_1.User.findByPk(data.ownerId)
            : await admin_model_1.Admin.findByPk(data.ownerId);
        if (!owner) {
            throw new errorHandler_1.AppError(404, 'Owner not found');
        }
        // Create organization
        const organization = await organization_model_1.Organization.create(Object.assign(Object.assign({}, data), { owner_id: data.ownerId, owner_type: data.ownerType }));
        // Add owner as super user
        await organization_member_service_1.OrganizationMemberService.addMember(organization.id, {
            email: owner.email,
            role: 'super_user',
            customPermissions: {
                canCreateSpaces: true,
                canApproveSpaces: true,
                canInviteMembers: true,
                canManageRoles: true,
                canDownloadFiles: true
            }
        });
        return this.getOrganization(organization.id);
    }
    static async getOrganizations() {
        const organizations = await organization_model_1.Organization.findAll({
            include: [
                {
                    model: user_model_1.User,
                    as: 'userOwner',
                    required: false,
                    where: sequelize_1.Sequelize.literal('"Organization"."owner_type" = \'user\''),
                    attributes: ['id', ['first_name', 'firstName'], ['last_name', 'lastName'], 'email']
                },
                {
                    model: admin_model_1.Admin,
                    as: 'adminOwner',
                    required: false,
                    where: sequelize_1.Sequelize.literal('"Organization"."owner_type" = \'admin\''),
                    attributes: ['id', ['first_name', 'firstName'], ['last_name', 'lastName'], 'email']
                }
            ],
            order: [['createdAt', 'DESC']],
            raw: true,
            nest: true
        });
        return organizations.map(org => {
            const owner = org.owner_type === 'user' ? org.userOwner : org.adminOwner;
            return Object.assign(Object.assign({}, org), { owner: owner ? `${owner.firstName} ${owner.lastName}` : 'Unknown' });
        });
    }
    static async getOrganization(id) {
        const organization = await organization_model_1.Organization.findByPk(id, {
            include: [
                {
                    model: user_model_1.User,
                    as: 'userOwner',
                    attributes: ['id', 'first_name', 'last_name', 'email'],
                    required: false
                },
                {
                    model: admin_model_1.Admin,
                    as: 'adminOwner',
                    attributes: ['id', 'first_name', 'last_name', 'email'],
                    required: false
                }
            ],
        });
        if (!organization) {
            throw new errorHandler_1.AppError(404, 'Organization not found');
        }
        return organization;
    }
    static async updateOrganization(id, data) {
        const organization = await this.getOrganization(id);
        // If domain is being updated, validate it
        if (data.domain) {
            // Validate domain format
            const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/i;
            if (!domainRegex.test(data.domain)) {
                throw new errorHandler_1.AppError(400, 'Invalid domain format. Please enter a valid domain (e.g., example.com)');
            }
            // Check if domain is already in use by another organization
            const existingOrg = await organization_model_1.Organization.findOne({
                where: {
                    domain: data.domain,
                    id: { [sequelize_1.Op.ne]: id } // Exclude current organization
                }
            });
            if (existingOrg) {
                throw new errorHandler_1.AppError(400, 'This domain is already registered with another organization');
            }
        }
        await organization.update(data);
        return this.getOrganization(id);
    }
    static async deleteOrganization(id) {
        const organization = await this.getOrganization(id);
        await organization.destroy();
    }
    static async getOrganizationsByOwner(ownerId, ownerType) {
        const organizations = await organization_model_1.Organization.findAll({
            where: {
                owner_id: ownerId,
                owner_type: ownerType
            },
            include: [
                {
                    model: user_model_1.User,
                    as: 'userOwner',
                    attributes: ['id', 'first_name', 'last_name', 'email'],
                    required: false
                },
                {
                    model: admin_model_1.Admin,
                    as: 'adminOwner',
                    attributes: ['id', 'first_name', 'last_name', 'email'],
                    required: false
                }
            ],
            order: [['created_at', 'DESC']],
        });
        return organizations;
    }
    static async findByDomain(domain) {
        return organization_model_1.Organization.findOne({ where: { domain } });
    }
    static async findDomainByUserId(userId) {
        const user = await user_model_1.User.findByPk(userId);
        if (!user) {
            throw new errorHandler_1.AppError(404, 'User not found');
        }
        const emailDomain = user.email.split('@')[1];
        // Find organization by domain
        const organization = await organization_model_1.Organization.findOne({
            where: { domain: emailDomain }
        });
        return (organization === null || organization === void 0 ? void 0 : organization.id) || null;
    }
}
exports.OrganizationService = OrganizationService;
