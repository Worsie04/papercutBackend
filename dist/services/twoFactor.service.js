"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwoFactorService = void 0;
const otplib_1 = require("otplib");
const qrcode_1 = __importDefault(require("qrcode"));
const user_model_1 = require("../models/user.model");
class TwoFactorService {
    constructor() { }
    static getInstance() {
        if (!TwoFactorService.instance) {
            TwoFactorService.instance = new TwoFactorService();
        }
        return TwoFactorService.instance;
    }
    async generateSecret(userId) {
        try {
            const user = await user_model_1.User.findByPk(userId);
            if (!user) {
                throw new Error('User not found');
            }
            const secret = otplib_1.authenticator.generateSecret();
            const appName = process.env.APP_NAME || 'YourApp';
            const otpauthUrl = otplib_1.authenticator.keyuri(user.email, appName, secret);
            // Generate QR code
            const qrCodeUrl = await qrcode_1.default.toDataURL(otpauthUrl);
            // Save secret temporarily (it will be confirmed after verification)
            await user.update({ twoFactorSecret: secret });
            return {
                secret,
                qrCodeUrl,
            };
        }
        catch (error) {
            console.error('Error generating 2FA secret:', error);
            throw error;
        }
    }
    async verifyToken(userId, token) {
        try {
            const user = await user_model_1.User.findByPk(userId);
            if (!user || !user.twoFactorSecret) {
                throw new Error('Invalid setup state');
            }
            const isValid = otplib_1.authenticator.verify({
                token,
                secret: user.twoFactorSecret,
            });
            if (isValid) {
                // If verification is successful, enable 2FA
                await user.update({
                    twoFactorEnabled: true
                });
            }
            return isValid;
        }
        catch (error) {
            console.error('Error verifying 2FA token:', error);
            throw error;
        }
    }
    async disable(userId, token) {
        try {
            const user = await user_model_1.User.findByPk(userId);
            if (!user || !user.twoFactorSecret || !user.twoFactorEnabled) {
                throw new Error('2FA is not enabled');
            }
            const isValid = otplib_1.authenticator.verify({
                token,
                secret: user.twoFactorSecret,
            });
            if (isValid) {
                await user.update({
                    twoFactorSecret: null,
                    twoFactorEnabled: false
                });
            }
            return isValid;
        }
        catch (error) {
            console.error('Error disabling 2FA:', error);
            throw error;
        }
    }
    async getStatus(userId) {
        try {
            const user = await user_model_1.User.findByPk(userId);
            if (!user) {
                throw new Error('User not found');
            }
            return {
                isEnabled: user.twoFactorEnabled,
            };
        }
        catch (error) {
            console.error('Error getting 2FA status:', error);
            throw error;
        }
    }
}
exports.TwoFactorService = TwoFactorService;
