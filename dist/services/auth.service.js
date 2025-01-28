"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const user_model_1 = require("../models/user.model");
const admin_model_1 = require("../models/admin.model");
const jwt_util_1 = require("../utils/jwt.util");
const errorHandler_1 = require("../presentation/middlewares/errorHandler");
class AuthService {
    static async loginUser(email, password) {
        const user = await user_model_1.User.findOne({ where: { email } });
        if (!user) {
            throw new errorHandler_1.AppError(401, 'Invalid credentials');
        }
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            throw new errorHandler_1.AppError(401, 'Invalid credentials');
        }
        if (!user.isActive) {
            throw new errorHandler_1.AppError(403, 'Account is deactivated');
        }
        // Update last login
        user.lastLoginAt = new Date();
        await user.save();
        const payload = {
            id: user.id,
            email: user.email,
            type: 'user',
        };
        return {
            accessToken: jwt_util_1.JwtUtil.generateToken(payload),
            refreshToken: jwt_util_1.JwtUtil.generateRefreshToken(user.id, 'user'),
            user,
        };
    }
    static async loginAdmin(email, password) {
        const admin = await admin_model_1.Admin.findOne({ where: { email } });
        if (!admin) {
            throw new errorHandler_1.AppError(401, 'Invalid credentials');
        }
        const isPasswordValid = await admin.comparePassword(password);
        if (!isPasswordValid) {
            throw new errorHandler_1.AppError(401, 'Invalid credentials');
        }
        if (!admin.isActive) {
            throw new errorHandler_1.AppError(403, 'Account is deactivated');
        }
        // Update last login
        admin.lastLoginAt = new Date();
        await admin.save();
        const payload = {
            id: admin.id,
            email: admin.email,
            type: 'admin',
            role: admin.role,
        };
        return {
            accessToken: jwt_util_1.JwtUtil.generateToken(payload),
            refreshToken: jwt_util_1.JwtUtil.generateRefreshToken(admin.id, 'admin'),
            user: admin,
        };
    }
    static async getUser(id, type) {
        if (type === 'admin') {
            const admin = await admin_model_1.Admin.findByPk(id);
            if (!admin) {
                throw new errorHandler_1.AppError(404, 'Admin not found');
            }
            return admin;
        }
        else {
            const user = await user_model_1.User.findByPk(id);
            if (!user) {
                throw new errorHandler_1.AppError(404, 'User not found');
            }
            return user;
        }
    }
    static async logout(id, type) {
        let user;
        if (type === 'admin') {
            user = await admin_model_1.Admin.findByPk(id);
            if (!user) {
                throw new errorHandler_1.AppError(404, 'Admin not found');
            }
        }
        else {
            user = await user_model_1.User.findByPk(id);
            if (!user) {
                throw new errorHandler_1.AppError(404, 'User not found');
            }
        }
        // Here you could implement token blacklisting if needed
        // For now, we'll just update the last login time
        if ('lastLoginAt' in user) {
            user.lastLoginAt = new Date();
            await user.save();
        }
    }
    static async refreshToken(refreshToken) {
        const decoded = jwt_util_1.JwtUtil.verifyToken(refreshToken);
        if (!decoded || !decoded.id || !decoded.type) {
            throw new errorHandler_1.AppError(401, 'Invalid refresh token');
        }
        let entity;
        if (decoded.type === 'admin') {
            entity = await admin_model_1.Admin.findByPk(decoded.id);
        }
        else {
            entity = await user_model_1.User.findByPk(decoded.id);
        }
        if (!entity) {
            throw new errorHandler_1.AppError(401, 'Invalid refresh token');
        }
        if (!entity.isActive) {
            throw new errorHandler_1.AppError(403, 'Account is deactivated');
        }
        const payload = {
            id: entity.id,
            email: entity.email,
            type: decoded.type,
            role: decoded.type === 'admin' ? entity.role : undefined,
        };
        return {
            accessToken: jwt_util_1.JwtUtil.generateToken(payload),
            refreshToken: jwt_util_1.JwtUtil.generateRefreshToken(entity.id, decoded.type),
        };
    }
    static async verifyEmail(token) {
        const decoded = jwt_util_1.JwtUtil.verifyToken(token);
        if (!decoded || !decoded.id || !decoded.type) {
            throw new errorHandler_1.AppError(401, 'Invalid verification token');
        }
        let entity;
        if (decoded.type === 'admin') {
            entity = await admin_model_1.Admin.findByPk(decoded.id);
        }
        else {
            entity = await user_model_1.User.findByPk(decoded.id);
        }
        if (!entity) {
            throw new errorHandler_1.AppError(404, 'User not found');
        }
        if (entity.emailVerifiedAt) {
            throw new errorHandler_1.AppError(400, 'Email already verified');
        }
        entity.emailVerifiedAt = new Date();
        await entity.save();
    }
    static async changePassword(userId, type, oldPassword, newPassword) {
        let entity;
        if (type === 'admin') {
            entity = await admin_model_1.Admin.findByPk(userId);
        }
        else {
            entity = await user_model_1.User.findByPk(userId);
        }
        if (!entity) {
            throw new errorHandler_1.AppError(404, 'User not found');
        }
        const isPasswordValid = await entity.comparePassword(oldPassword);
        if (!isPasswordValid) {
            throw new errorHandler_1.AppError(401, 'Invalid current password');
        }
        entity.password = newPassword;
        await entity.save();
    }
    static async resetPassword(token, newPassword) {
        const decoded = jwt_util_1.JwtUtil.verifyToken(token);
        if (!decoded || !decoded.id || !decoded.type) {
            throw new errorHandler_1.AppError(401, 'Invalid reset token');
        }
        let entity;
        if (decoded.type === 'admin') {
            entity = await admin_model_1.Admin.findByPk(decoded.id);
        }
        else {
            entity = await user_model_1.User.findByPk(decoded.id);
        }
        if (!entity) {
            throw new errorHandler_1.AppError(404, 'User not found');
        }
        entity.password = newPassword;
        await entity.save();
    }
    static async generatePasswordResetToken(email, type) {
        let entity;
        if (type === 'admin') {
            entity = await admin_model_1.Admin.findOne({ where: { email } });
        }
        else {
            entity = await user_model_1.User.findOne({ where: { email } });
        }
        if (!entity) {
            throw new errorHandler_1.AppError(404, 'User not found');
        }
        const payload = {
            id: entity.id,
            email: entity.email,
            type,
        };
        return jwt_util_1.JwtUtil.generateToken(payload);
    }
    static async generateEmailVerificationToken(userId, type) {
        let entity;
        if (type === 'admin') {
            entity = await admin_model_1.Admin.findByPk(userId);
        }
        else {
            entity = await user_model_1.User.findByPk(userId);
        }
        if (!entity) {
            throw new errorHandler_1.AppError(404, 'User not found');
        }
        if (entity.emailVerifiedAt) {
            throw new errorHandler_1.AppError(400, 'Email already verified');
        }
        const payload = {
            id: entity.id,
            email: entity.email,
            type,
        };
        return jwt_util_1.JwtUtil.generateToken(payload);
    }
}
exports.AuthService = AuthService;
