"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const sequelize_1 = require("sequelize");
const user_model_1 = require("../models/user.model");
const role_model_1 = require("../models/role.model");
const errorHandler_1 = require("../presentation/middlewares/errorHandler");
const jwt_util_1 = require("../utils/jwt.util");
const sequelize_2 = require("../infrastructure/database/sequelize");
class UserService {
    static async getUsers({ page, limit, search, sortBy = 'createdAt', sortOrder = 'desc', }) {
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
            include: [{
                    model: role_model_1.Role,
                    as: 'roles',
                    through: { attributes: [] } // Exclude junction table attributes
                }]
        });
        return {
            users: rows,
            total: count,
            page,
            totalPages: Math.ceil(count / limit),
        };
    }
    static async getUser(id) {
        const user = await user_model_1.User.findByPk(id, {
            include: [{
                    model: role_model_1.Role,
                    as: 'roles',
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
                    as: 'roles',
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
}
exports.UserService = UserService;
