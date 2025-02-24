"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const sequelize_1 = require("sequelize");
const user_model_1 = require("../models/user.model");
const role_model_1 = require("../models/role.model");
const errorHandler_1 = require("../presentation/middlewares/errorHandler");
const jwt_util_1 = require("../utils/jwt.util");
const sequelize_2 = require("../infrastructure/database/sequelize");
const organization_model_1 = require("../models/organization.model");
const organization_member_service_1 = require("./organization-member.service");
const cabinet_member_model_1 = require("../models/cabinet-member.model");
const cabinet_model_1 = require("../models/cabinet.model");
const cabinet_member_permission_model_1 = require("../models/cabinet-member-permission.model");
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
            // include: [{
            //   model: Role,
            //   as: 'Roles',
            //   through: { attributes: [] }
            // }],
            // raw: false // Ensure we get Sequelize model instances
        });
        // Transform the users to plain objects
        // const users = rows.map(user => user.get({ plain: true }));
        return {
            users: rows, // This will now be a plain array of user objects
            total: count,
            page,
            totalPages: Math.ceil(count / limit),
        };
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
        var _a;
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
        // If password is being set (during magic link flow), try to add user to organization
        if (data.password) {
            try {
                // Extract domain from email
                const emailDomain = user.email.split('@')[1];
                // Find organization by domain
                const organization = await organization_model_1.Organization.findOne({
                    where: { domain: emailDomain }
                });
                if (organization) {
                    // Get user's role (assuming first role is the default one)
                    const userRoles = await user.getRoles();
                    const defaultRole = ((_a = userRoles[0]) === null || _a === void 0 ? void 0 : _a.name) || 'member_full'; // Default to member_full if no role found
                    // Add user to organization
                    await organization_member_service_1.OrganizationMemberService.addMember(organization.id, {
                        email: user.email,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        role: defaultRole,
                    });
                }
            }
            catch (error) {
                // Log error but don't fail the password update
                console.error('Error adding user to organization:', error);
            }
        }
        // Fetch updated user with role information
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
            return (Object.assign(Object.assign({}, (_a = member.cabinet) === null || _a === void 0 ? void 0 : _a.toJSON()), { role: (_b = member.memberPermissions) === null || _b === void 0 ? void 0 : _b.role, permissions: (_c = member.memberPermissions) === null || _c === void 0 ? void 0 : _c.permissions }));
        });
    }
}
exports.UserService = UserService;
