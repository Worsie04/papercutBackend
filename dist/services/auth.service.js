"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const user_model_1 = require("../models/user.model");
const admin_model_1 = require("../models/admin.model");
const jwt_util_1 = require("../utils/jwt.util");
const errorHandler_1 = require("../presentation/middlewares/errorHandler");
const otplib_1 = require("otplib");
const crypto_1 = __importDefault(require("crypto"));
const sequelize_1 = require("sequelize");
class AuthService {
    constructor() { }
    static getInstance() {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }
    static async login(email, password, twoFactorToken) {
        try {
            const user = await user_model_1.User.findOne({ where: { email } });
            if (!user || !user.isActive) {
                throw new errorHandler_1.AppError(401, 'Invalid credentials');
            }
            const isPasswordValid = await user.comparePassword(password);
            if (!isPasswordValid) {
                throw new errorHandler_1.AppError(401, 'Invalid credentials');
            }
            // Check if 2FA is enabled
            if (user.twoFactorEnabled) {
                // If 2FA token is not provided, return flag indicating 2FA is required
                if (!twoFactorToken) {
                    return {
                        user: {
                            id: user.id,
                            email: user.email,
                            firstName: user.firstName,
                            lastName: user.lastName,
                        },
                        accessToken: '',
                        requiresTwoFactor: true
                    };
                }
                // Verify 2FA token
                const isValid = otplib_1.authenticator.verify({
                    token: twoFactorToken,
                    secret: user.twoFactorSecret
                });
                if (!isValid) {
                    throw new errorHandler_1.AppError(401, 'Invalid 2FA code');
                }
            }
            // Generate JWT token
            const accessToken = jwt_util_1.JwtUtil.generateToken({
                id: user.id,
                email: user.email,
                type: 'user'
            });
            return {
                user,
                accessToken,
                requiresTwoFactor: false
            };
        }
        catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }
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
        //console.log('AuthService.loginAdmin called with email:', email);
        const admin = await admin_model_1.Admin.findOne({ where: { email } });
        //console.log('Admin found:', admin ? 'yes' : 'no');
        if (!admin) {
            //console.log('Admin not found for email:', email);
            throw new errorHandler_1.AppError(401, 'Invalid credentials');
        }
        //console.log('Comparing passwords...');
        const isPasswordValid = await admin.comparePassword(password);
        //console.log('Password valid:', isPasswordValid);
        if (!isPasswordValid) {
            //console.log('Invalid password for admin:', email);
            throw new errorHandler_1.AppError(401, 'Invalid credentials');
        }
        if (!admin.isActive) {
            //console.log('Admin account is not active:', email);
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
        //console.log('Generating tokens for admin:', email);
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
    static async generateMagicLinkToken(userId) {
        const token = crypto_1.default.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        // Store the token in the database
        await user_model_1.User.update({ magicLinkToken: token, magicLinkTokenExpiresAt: expiresAt }, { where: { id: userId } });
        return token;
    }
    static async verifyMagicLinkToken(token) {
        const user = await user_model_1.User.findOne({
            where: {
                magicLinkToken: token,
                magicLinkTokenExpiresAt: {
                    [sequelize_1.Op.gt]: new Date(),
                },
            },
        });
        if (!user) {
            return null;
        }
        // // Clear the used token
        // await User.update(
        //   { 
        //     magicLinkToken: '',
        //     magicLinkTokenExpiresAt: undefined 
        //   },
        //   { where: { id: user.id } }
        // );
        return user.id;
    }
    static async clearMagicLinkToken(userId) {
        await user_model_1.User.update({ magicLinkToken: '', magicLinkTokenExpiresAt: undefined }, { where: { id: userId } });
    }
    static async isTwoFactorEnabled(userId) {
        const user = await user_model_1.User.findByPk(userId);
        return (user === null || user === void 0 ? void 0 : user.twoFactorEnabled) || false;
    }
    static async generateAccessToken(user) {
        const payload = {
            id: user.id,
            email: user.email,
            type: 'user',
        };
        return jwt_util_1.JwtUtil.generateToken(payload);
    }
}
exports.AuthService = AuthService;
