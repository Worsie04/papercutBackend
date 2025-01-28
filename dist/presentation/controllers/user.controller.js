"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const user_service_1 = require("../../services/user.service");
const email_service_1 = require("../../services/email.service");
class UserController {
    static async getUsers(req, res, next) {
        try {
            const { page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
            const result = await user_service_1.UserService.getUsers({
                page: Number(page),
                limit: Number(limit),
                search: search,
                sortBy: sortBy,
                sortOrder: sortOrder,
            });
            res.json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async getUser(req, res, next) {
        try {
            const { id } = req.params;
            const user = await user_service_1.UserService.getUser(id);
            res.json(user);
        }
        catch (error) {
            next(error);
        }
    }
    static async createUser(req, res, next) {
        try {
            const user = await user_service_1.UserService.createUser(req.body);
            res.status(201).json(user);
        }
        catch (error) {
            next(error);
        }
    }
    static async updateUser(req, res, next) {
        try {
            const { id } = req.params;
            const user = await user_service_1.UserService.updateUser(id, req.body);
            res.json(user);
        }
        catch (error) {
            next(error);
        }
    }
    static async deleteUser(req, res, next) {
        try {
            const { id } = req.params;
            await user_service_1.UserService.deleteUser(id);
            res.status(204).send();
        }
        catch (error) {
            next(error);
        }
    }
    static async activateUser(req, res, next) {
        try {
            const { id } = req.params;
            const user = await user_service_1.UserService.updateUser(id, { isActive: true });
            res.json(user);
        }
        catch (error) {
            next(error);
        }
    }
    static async deactivateUser(req, res, next) {
        try {
            const { id } = req.params;
            const user = await user_service_1.UserService.updateUser(id, { isActive: false });
            res.json(user);
        }
        catch (error) {
            next(error);
        }
    }
    static async resendVerification(req, res, next) {
        try {
            const { id } = req.params;
            const token = await user_service_1.UserService.generateVerificationToken(id);
            const user = await user_service_1.UserService.getUser(id);
            await email_service_1.EmailService.sendVerificationEmail(user.email, token, 'user');
            res.json({ message: 'Verification email sent' });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.UserController = UserController;
