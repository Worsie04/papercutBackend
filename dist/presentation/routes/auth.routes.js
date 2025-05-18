"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const validate_middleware_1 = require("../middlewares/validate.middleware");
const auth_validator_1 = require("../validators/auth.validator");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const router = (0, express_1.Router)();
// Rate limiting for auth endpoints
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 10000, // 15 minutes
    max: 15, // 5 requests per windowMs
    message: 'Too many attempts, please try again later',
});
const tokenLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 requests per windowMs
    message: 'Too many token refresh attempts, please try again later',
});
//validate(checkEmailSchema)
// Magic Link routes
router.post('/check-email', (0, validate_middleware_1.validate_regular)(auth_validator_1.checkEmailSchema), auth_controller_1.AuthController.checkEmail);
router.post('/magic-link', authLimiter, (0, validate_middleware_1.validate_regular)(auth_validator_1.magicLinkSchema), auth_controller_1.AuthController.sendMagicLink);
router.post('/verify-magic-link', (0, validate_middleware_1.validate_regular)(auth_validator_1.verifyMagicLinkSchema), auth_controller_1.AuthController.verifyMagicLink);
router.post('/set-password', (0, validate_middleware_1.validate_regular)(auth_validator_1.setPasswordSchema), auth_controller_1.AuthController.setPassword);
//validate(loginSchema)
// Public routes
router.post('/login', authLimiter, (0, validate_middleware_1.validate_regular)(auth_validator_1.loginSchema), auth_controller_1.AuthController.login);
router.post('/admin/login', authLimiter, (0, validate_middleware_1.validate_regular)(auth_validator_1.loginSchema), auth_controller_1.AuthController.loginAdmin);
router.post('/refresh-token', tokenLimiter, (0, validate_middleware_1.validate)(auth_validator_1.refreshTokenSchema), auth_controller_1.AuthController.refreshToken);
router.post('/forgot-password', authLimiter, (0, validate_middleware_1.validate)(auth_validator_1.forgotPasswordSchema), auth_controller_1.AuthController.forgotPassword);
router.post('/reset-password', authLimiter, (0, validate_middleware_1.validate)(auth_validator_1.resetPasswordSchema), auth_controller_1.AuthController.resetPassword);
router.post('/verify-email', (0, validate_middleware_1.validate)(auth_validator_1.verifyEmailSchema), auth_controller_1.AuthController.verifyEmail);
// Token verification endpoint
//router.get('/verify', authenticate(), AuthController.verifyToken);
// Protected routes
router.post('/change-password', (0, auth_middleware_1.authenticate)(), auth_middleware_1.requireActive, (0, validate_middleware_1.validate)(auth_validator_1.changePasswordSchema), auth_controller_1.AuthController.changePassword);
router.post('/resend-verification', (0, auth_middleware_1.authenticate)(), auth_controller_1.AuthController.resendVerification);
// Logout endpoint
router.post('/logout', (0, auth_middleware_1.authenticate)(), auth_controller_1.AuthController.logout);
// Register new user route
router.post('/register', auth_validator_1.validateRegisterRequest, auth_controller_1.AuthController.register);
exports.default = router;
