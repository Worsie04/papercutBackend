"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwoFactorController = void 0;
const twoFactor_service_1 = require("../../services/twoFactor.service");
class TwoFactorController {
    constructor() {
        this.setup = async (req, res) => {
            var _a;
            try {
                if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.id)) {
                    res.status(401).json({ message: 'User not authenticated' });
                    return;
                }
                const userId = req.user.id;
                const { secret, qrCodeUrl } = await this.twoFactorService.generateSecret(userId);
                res.json({ secret, qrCodeUrl });
            }
            catch (error) {
                console.error('2FA setup error:', error);
                res.status(500).json({ message: 'Failed to setup 2FA' });
            }
        };
        this.verify = async (req, res) => {
            var _a;
            try {
                if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.id)) {
                    res.status(401).json({ message: 'User not authenticated' });
                    return;
                }
                const userId = req.user.id;
                const { token } = req.body;
                if (!token) {
                    res.status(400).json({ message: 'Verification token is required' });
                    return;
                }
                const isValid = await this.twoFactorService.verifyToken(userId, token);
                if (isValid) {
                    res.json({ message: '2FA enabled successfully' });
                }
                else {
                    res.status(400).json({ message: 'Invalid verification code' });
                }
            }
            catch (error) {
                console.error('2FA verification error:', error);
                res.status(500).json({ message: 'Failed to verify 2FA token' });
            }
        };
        this.disable = async (req, res) => {
            var _a;
            try {
                if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.id)) {
                    res.status(401).json({ message: 'User not authenticated' });
                    return;
                }
                const userId = req.user.id;
                const { token } = req.body;
                if (!token) {
                    res.status(400).json({ message: 'Verification token is required' });
                    return;
                }
                const isValid = await this.twoFactorService.disable(userId, token);
                if (isValid) {
                    res.json({ message: '2FA disabled successfully' });
                }
                else {
                    res.status(400).json({ message: 'Invalid verification code' });
                }
            }
            catch (error) {
                console.error('2FA disable error:', error);
                res.status(500).json({ message: 'Failed to disable 2FA' });
            }
        };
        this.getStatus = async (req, res) => {
            var _a;
            try {
                if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.id)) {
                    res.status(401).json({ message: 'User not authenticated' });
                    return;
                }
                const userId = req.user.id;
                const status = await this.twoFactorService.getStatus(userId);
                res.json(status);
            }
            catch (error) {
                console.error('2FA status error:', error);
                res.status(500).json({ message: 'Failed to get 2FA status' });
            }
        };
        this.twoFactorService = twoFactor_service_1.TwoFactorService.getInstance();
    }
}
exports.TwoFactorController = TwoFactorController;
