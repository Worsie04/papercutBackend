"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_service_1 = require("../../services/auth.service");
const errorHandler_1 = require("../middlewares/errorHandler");
const user_service_1 = require("../../services/user.service");
const organization_service_1 = require("../../services/organization.service");
const email_service_1 = require("../../services/email.service");
const crypto_1 = __importDefault(require("crypto"));
class AuthController {
    static async login(req, res) {
        console.log("login called");
        try {
            const { email, password, twoFactorToken } = req.body;
            const result = await auth_service_1.AuthService.login(email, password, twoFactorToken);
            if (result.requiresTwoFactor) {
                // Return partial response when 2FA is required
                res.json({
                    requiresTwoFactor: true,
                    user: {
                        id: result.user.id,
                        email: result.user.email,
                        firstName: result.user.firstName,
                        lastName: result.user.lastName,
                    }
                });
                return;
            }
            // Set JWT token in cookie
            res.cookie('access_token_w', result.accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            });
            // Return full response
            res.json({
                user: result.user,
                accessToken: result.accessToken,
                requiresTwoFactor: false
            });
        }
        catch (error) {
            console.error('Login error:', error);
            if (error instanceof errorHandler_1.AppError) {
                res.status(error.statusCode).json({ message: error.message });
            }
            else {
                res.status(500).json({ message: 'Internal server error' });
            }
        }
    }
    ;
    static async loginAdmin(req, res, next) {
        console.log("loginAdmin called");
        try {
            const { email, password } = req.body;
            console.log('Login attempt for admin:', email);
            const result = await auth_service_1.AuthService.loginAdmin(email, password);
            console.log('Login successful for admin:', email);
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
            console.error('Admin login error:', error);
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
    /**
     * Check if an email exists and has a password set
     */
    static async checkEmail(req, res) {
        try {
            const { email } = req.body;
            const user = await user_service_1.UserService.findByEmail(email);
            const organization = await organization_service_1.OrganizationService.findByDomain(email.split('@')[1]);
            return res.json({
                exists: !!user,
                hasPassword: (user === null || user === void 0 ? void 0 : user.password) ? true : false,
                organization: organization ? {
                    id: organization.id,
                    name: organization.name,
                    domain: organization.domain,
                } : null,
            });
        }
        catch (error) {
            console.error('Check email error:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
    /**
     * Send a magic link to the user's email
     */
    static async sendMagicLink(req, res) {
        try {
            const { email } = req.body;
            const domain = email.split('@')[1];
            // Check if the email domain belongs to an organization
            const organization = await organization_service_1.OrganizationService.findByDomain(domain);
            if (!organization) {
                return res.status(403).json({ message: 'Email domain not associated with any organization' });
            }
            // Get or create user
            let user = await user_service_1.UserService.findByEmail(email);
            if (!user) {
                // Create user with minimal required fields
                user = await user_service_1.UserService.createUser({
                    email,
                    password: '', // temporary password
                    firstName: email.split('@')[0], // temporary name from email
                    lastName: 'User',
                    role: 'member_full',
                });
            }
            // Generate magic link token
            const token = await auth_service_1.AuthService.generateMagicLinkToken(user.id);
            // Save the magic link token to the user record
            await user_service_1.UserService.updateUser(user.id, {
                magicLinkToken: token,
                magicLinkTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
            });
            // Send magic link email with the correct token parameter
            console.log('Generated token:', token);
            console.log('CLIENT_URL:', process.env.CLIENT_URL);
            const magicLink = `${process.env.CLIENT_URL}/login?token=${token}`;
            console.log('Generated magic link:', magicLink);
            await email_service_1.EmailService.sendMagicLink(email, magicLink);
            return res.json({ message: 'Magic link sent successfully' });
        }
        catch (error) {
            console.error('Send magic link error:', error);
            if (error instanceof errorHandler_1.AppError) {
                return res.status(error.statusCode).json({ message: error.message });
            }
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
    /**
     * Verify magic link token and authenticate user
     */
    static async verifyMagicLink(req, res) {
        try {
            const { token } = req.body;
            // Verify token and get user
            const userId = await auth_service_1.AuthService.verifyMagicLinkToken(token);
            if (!userId) {
                return res.status(401).json({ message: 'Invalid or expired token' });
            }
            const user = await user_service_1.UserService.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            // Check if 2FA is enabled
            const requiresTwoFactor = await auth_service_1.AuthService.isTwoFactorEnabled(user.id);
            // Generate access token
            const accessToken = await auth_service_1.AuthService.generateAccessToken(user);
            return res.json({
                user,
                accessToken,
                requiresTwoFactor,
            });
        }
        catch (error) {
            console.error('Verify magic link error:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
    /**
     * Set password for magic link users
     */
    static async setPassword(req, res) {
        try {
            const { token, password } = req.body;
            // Verify token and get user
            const userId = await auth_service_1.AuthService.verifyMagicLinkToken(token);
            if (!userId) {
                return res.status(401).json({ message: 'Invalid or expired token' });
            }
            const user = await user_service_1.UserService.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            // Update user's password
            await user_service_1.UserService.updateUser(userId, { password, isActive: true });
            // Generate access token
            const accessToken = await auth_service_1.AuthService.generateAccessToken(user);
            // Clear the magic link token from the user record
            await auth_service_1.AuthService.clearMagicLinkToken(userId);
            return res.json({
                user,
                accessToken,
            });
        }
        catch (error) {
            console.error('Set password error:', error);
            if (error instanceof errorHandler_1.AppError) {
                return res.status(error.statusCode).json({ message: error.message });
            }
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
    static async register(req, res) {
        try {
            const { firstName, lastName, email, role, position } = req.body;
            // Create user with a temporary password
            const temporaryPassword = crypto_1.default.randomBytes(20).toString('hex');
            const user = await user_service_1.UserService.createUser({
                email,
                firstName,
                lastName,
                role,
                password: temporaryPassword,
                isActive: false,
                position,
            });
            // Generate magic link token
            const token = await auth_service_1.AuthService.generateMagicLinkToken(user.id);
            await user_service_1.UserService.updateUser(user.id, {
                magicLinkToken: token,
                magicLinkTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
            });
            // Send magic link email
            const magicLinkUrl = `${process.env.CLIENT_URL}/create-password?token=${token}`;
            await email_service_1.EmailService.sendMagicLink(email, magicLinkUrl);
            res.status(201).json({
                message: 'User registered successfully. Magic link has been sent to the email.',
                userId: user.id,
            });
        }
        catch (error) {
            if (error instanceof errorHandler_1.AppError) {
                res.status(error.statusCode).json({ message: error.message });
            }
            else {
                console.error('Registration error:', error);
                res.status(500).json({ message: 'Failed to register user' });
            }
        }
    }
}
exports.AuthController = AuthController;
