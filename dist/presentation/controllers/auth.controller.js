"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_service_1 = require("../../services/auth.service");
const errorHandler_1 = require("../middlewares/errorHandler");
class AuthController {
    static async loginUser(req, res, next) {
        try {
            const { email, password } = req.body;
            const result = await auth_service_1.AuthService.loginUser(email, password);
            // Set token in cookie
            res.cookie('access_token_w', result.accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            });
            res.json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async loginAdmin(req, res, next) {
        try {
            const { email, password } = req.body;
            const result = await auth_service_1.AuthService.loginAdmin(email, password);
            // Set token in cookie
            res.cookie('access_token_w', result.accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            });
            res.json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async refreshToken(req, res, next) {
        try {
            const { refreshToken } = req.body;
            const result = await auth_service_1.AuthService.refreshToken(refreshToken);
            res.json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async verifyEmail(req, res, next) {
        try {
            const { token } = req.body;
            await auth_service_1.AuthService.verifyEmail(token);
            res.json({ message: 'Email verified successfully' });
        }
        catch (error) {
            next(error);
        }
    }
    static async verifyToken(req, res, next) {
        try {
            if (!req.user) {
                throw new errorHandler_1.AppError(401, 'Invalid token');
            }
            const user = await auth_service_1.AuthService.getUser(req.user.id, req.user.type);
            res.json({ user });
        }
        catch (error) {
            next(error);
        }
    }
    static async logout(req, res, next) {
        try {
            if (!req.user) {
                throw new errorHandler_1.AppError(401, 'Not authenticated');
            }
            await auth_service_1.AuthService.logout(req.user.id, req.user.type);
            res.json({ message: 'Logged out successfully' });
        }
        catch (error) {
            next(error);
        }
    }
    static async changePassword(req, res, next) {
        try {
            if (!req.user) {
                throw new errorHandler_1.AppError(401, 'Authentication required');
            }
            const { oldPassword, newPassword } = req.body;
            await auth_service_1.AuthService.changePassword(req.user.id, req.user.type, oldPassword, newPassword);
            res.json({ message: 'Password changed successfully' });
        }
        catch (error) {
            next(error);
        }
    }
    static async forgotPassword(req, res, next) {
        try {
            const { email, type = 'user' } = req.body;
            const token = await auth_service_1.AuthService.generatePasswordResetToken(email, type);
            // TODO: Send email with reset token
            res.json({ message: 'Password reset instructions sent to email' });
        }
        catch (error) {
            // Don't expose whether the email exists
            res.json({ message: 'If the email exists, reset instructions will be sent' });
        }
    }
    static async resetPassword(req, res, next) {
        try {
            const { token, newPassword } = req.body;
            await auth_service_1.AuthService.resetPassword(token, newPassword);
            res.json({ message: 'Password reset successfully' });
        }
        catch (error) {
            next(error);
        }
    }
    static async resendVerification(req, res, next) {
        try {
            if (!req.user) {
                throw new errorHandler_1.AppError(401, 'Authentication required');
            }
            const token = await auth_service_1.AuthService.generateEmailVerificationToken(req.user.id, req.user.type);
            // TODO: Send verification email
            res.json({ message: 'Verification email sent' });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AuthController = AuthController;
