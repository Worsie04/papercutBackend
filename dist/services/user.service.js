"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const sequelize_1 = require("sequelize");
const user_model_1 = require("../models/user.model");
const role_model_1 = require("../models/role.model");
const errorHandler_1 = require("../presentation/middlewares/errorHandler");
const jwt_util_1 = require("../utils/jwt.util");
const sequelize_2 = require("../infrastructure/database/sequelize");
const organization_member_service_1 = require("./organization-member.service");
const cabinet_member_model_1 = require("../models/cabinet-member.model");
const cabinet_model_1 = require("../models/cabinet.model");
const cabinet_member_permission_model_1 = require("../models/cabinet-member-permission.model");
const organization_service_1 = require("./organization.service");
const group_service_1 = require("./group.service");
const organization_member_model_1 = require("../models/organization-member.model");
class UserService {
    static async getUsers({ page, limit, search, sortBy = 'created_at', sortOrder = 'desc', }) {
        const offset = (page - 1) * limit;
        const whereClause = search
            ? {
                [sequelize_1.Op.or]: [
                    { email: { [sequelize_1.Op.iLike]: `%${search}%` } },
                    { firstName: { [sequelize_1.Op.iLike]: `%${search}%` } },
                    { lastName: { [sequelize_1.Op.iLike]: `%${search}%` } },
                ],
            }
            : {};
        const { count, rows } = await user_model_1.User.findAndCountAll({
            where: whereClause,
            limit,
            offset,
            order: [[sortBy, sortOrder]],
            attributes: ['id', 'email', 'firstName', 'lastName', 'createdAt', 'updatedAt', 'avatar', 'isActive', 'position'],
            include: [{
                    model: role_model_1.Role,
                    as: 'Roles',
                    through: { attributes: [] }
                }],
            raw: false
        });
        // Transform the users to plain objects
        // const users = rows.map(user => user.get({ plain: true }));
        return {
            users: rows,
            total: count,
            page,
            totalPages: Math.ceil(count / limit),
        };
    }
    static async getSuperUsers(userId) {
        // Find the organizations the current user belongs to
        const userOrganizations = await organization_member_model_1.OrganizationMember.findAll({
            where: {
                userId: userId,
                status: 'active'
            },
            attributes: ['organizationId']
        });
        if (!userOrganizations || userOrganizations.length === 0) {
            return [];
        }
        // Extract organization IDs
        const organizationIds = userOrganizations.map((org) => org.organizationId);
        // Find all organization members with 'super_user' role in these organizations
        const superUserMembers = await organization_member_model_1.OrganizationMember.findAll({
            where: {
                organizationId: organizationIds,
                role: 'super_user',
                status: 'active'
            },
            include: [{
                    model: user_model_1.User,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
                }]
        });
        // Extract and return the user objects
        // Use type assertion and get() to safely extract the user objects
        const superUsers = superUserMembers
            .map((member) => {
            const memberData = member.get({ plain: true });
            return memberData.user;
        })
            .filter((user) => user !== null && user !== undefined);
        return superUsers;
    }
    static async getUser(id) {
        const user = await user_model_1.User.findByPk(id, {
            include: [{
                    model: role_model_1.Role,
                    as: 'Roles',
                    through: { attributes: [] }
                }]
        });
        if (!user) {
            throw new errorHandler_1.AppError(404, 'User not found');
        }
        return user;
    }
    static async createUser(data) {
        const existingUser = await user_model_1.User.findOne({
            where: { email: data.email },
        });
        if (existingUser) {
            throw new errorHandler_1.AppError(400, 'Email already in use');
        }
        // Find the role
        const role = await role_model_1.Role.findOne({
            where: { name: data.role }
        });
        if (!role) {
            throw new errorHandler_1.AppError(400, 'Invalid role specified');
        }
        // Create user and assign role in a transaction
        const user = await sequelize_2.sequelize.transaction(async (transaction) => {
            const newUser = await user_model_1.User.create(data, { transaction });
            await newUser.addRole(role, { transaction });
            return newUser;
        });
        // Fetch the user with role information
        return this.getUser(user.id);
    }
    static async updateUser(id, data) {
        const user = await user_model_1.User.findByPk(id, {
            include: [{
                    model: role_model_1.Role,
                    as: 'Roles',
                    through: { attributes: [] }
                }]
        });
        if (!user) {
            throw new errorHandler_1.AppError(404, 'User not found');
        }
        if (data.email && data.email !== user.email) {
            const existingUser = await user_model_1.User.findOne({
                where: { email: data.email },
            });
            if (existingUser) {
                throw new errorHandler_1.AppError(400, 'Email already in use');
            }
        }
        // Handle role update if provided
        if (data.role) {
            const role = await role_model_1.Role.findOne({
                where: { name: data.role }
            });
            if (!role) {
                throw new errorHandler_1.AppError(400, 'Invalid role specified');
            }
            await sequelize_2.sequelize.transaction(async (transaction) => {
                await user.update(data, { transaction });
                await user.setRoles([role], { transaction });
            });
        }
        else {
            await user.update(data);
        }
        console.log('User updated:', data.position);
        return this.getUser(id);
    }
    static async deleteUser(id) {
        const user = await user_model_1.User.findByPk(id);
        if (!user) {
            throw new errorHandler_1.AppError(404, 'User not found');
        }
        await user.destroy();
    }
    static async generateVerificationToken(id) {
        const user = await user_model_1.User.findByPk(id);
        if (!user) {
            throw new errorHandler_1.AppError(404, 'User not found');
        }
        if (user.emailVerifiedAt) {
            throw new errorHandler_1.AppError(400, 'Email already verified');
        }
        return jwt_util_1.JwtUtil.generateToken({
            id: user.id,
            email: user.email,
            type: 'user',
        });
    }
    static async findByEmail(email) {
        return user_model_1.User.findOne({ where: { email } });
    }
    static async findById(id) {
        return user_model_1.User.findByPk(id);
    }
    static async create(data) {
        return user_model_1.User.create(data);
    }
    static async getUserCabinets(userId) {
        const user = await user_model_1.User.findByPk(userId);
        if (!user) {
            throw new errorHandler_1.AppError(404, 'User not found');
        }
        // Find all cabinet members for the user
        const cabinetMembers = await cabinet_member_model_1.CabinetMember.findAll({
            where: {
                userId,
            },
            include: [{
                    model: cabinet_model_1.Cabinet,
                    as: 'cabinet',
                    where: {
                        status: 'approved',
                        isActive: true
                    },
                    attributes: ['id', 'name', 'description']
                },
                {
                    model: cabinet_member_permission_model_1.CabinetMemberPermission,
                    as: 'memberPermissions',
                    attributes: ['role', 'permissions'],
                    required: false,
                    where: {
                        userId,
                    }
                }]
        });
        // Extract cabinets from cabinet members with role and permissions
        return cabinetMembers.map(member => {
            var _a, _b, _c;
            // Get the cabinet data using the association
            const cabinetData = (_a = member.cabinet) === null || _a === void 0 ? void 0 : _a.toJSON();
            return Object.assign(Object.assign({}, cabinetData), { role: (_b = member.memberPermissions) === null || _b === void 0 ? void 0 : _b.role, permissions: (_c = member.memberPermissions) === null || _c === void 0 ? void 0 : _c.permissions });
        });
    }
    static async getUserWithRelatedData(userId, includeParams = []) {
        // Get basic user data
        const user = await this.getUser(userId);
        // Initialize result object
        const result = {
            user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                avatar: user.avatar,
                position: user.position,
            }
        };
        // Check if user is a super_user
        let isSuperUser = false;
        // First check organization_members table
        const organizations = await organization_service_1.OrganizationService.findDomainByUserId(userId);
        result.organization = organizations;
        if (organizations && organizations.length > 0) {
            const members = await organization_member_service_1.OrganizationMemberService.getOrganizationMembers(organizations);
            const userMember = members.find(member => member.userId === userId);
            if (userMember && userMember.role === 'super_user') {
                isSuperUser = true;
            }
        }
        if (!isSuperUser) {
            const userRoles = await user.getRoles();
            const hasSuperUserRole = userRoles.some(role => ['super_user', 'admin', 'system_admin'].includes(role.name));
            if (hasSuperUserRole) {
                isSuperUser = true;
            }
        }
        result.isSuperUser = isSuperUser;
        if (includeParams.includes('organizations')) {
            result.organization = organizations;
        }
        if (includeParams.includes('groups')) {
            const groups = await group_service_1.GroupService.getGroupsByUserId(userId);
            result.groups = groups;
        }
        if (includeParams.includes('cabinets')) {
            const cabinets = await this.getUserCabinets(userId);
            result.cabinets = cabinets;
        }
        if (includeParams.includes('roles')) {
            const roles = await user.getRoles();
            result.roles = roles;
        }
        return result;
    }
}
exports.UserService = UserService;
