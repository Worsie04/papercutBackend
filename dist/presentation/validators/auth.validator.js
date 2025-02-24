"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRegisterRequest = exports.setPasswordSchema = exports.verifyMagicLinkSchema = exports.magicLinkSchema = exports.checkEmailSchema = exports.verifyEmailSchema = exports.forgotPasswordSchema = exports.resetPasswordSchema = exports.changePasswordSchema = exports.refreshTokenSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
const express_validator_1 = require("express-validator");
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
});
exports.refreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string(),
});
exports.changePasswordSchema = zod_1.z.object({
    oldPassword: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
    newPassword: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
});
exports.resetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string(),
    newPassword: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
});
exports.forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
});
exports.verifyEmailSchema = zod_1.z.object({
    token: zod_1.z.string(),
});
exports.checkEmailSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
});
exports.magicLinkSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
});
exports.verifyMagicLinkSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, 'Token is required'),
});
exports.setPasswordSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, 'Token is required'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
});
exports.validateRegisterRequest = [
    (0, express_validator_1.body)('firstName')
        .trim()
        .notEmpty()
        .withMessage('First name is required')
        .isLength({ max: 50 })
        .withMessage('First name must be at most 50 characters'),
    (0, express_validator_1.body)('lastName')
        .trim()
        .notEmpty()
        .withMessage('Last name is required')
        .isLength({ max: 50 })
        .withMessage('Last name must be at most 50 characters'),
    (0, express_validator_1.body)('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Invalid email format')
        .normalizeEmail(),
    (0, express_validator_1.body)('role')
        .trim()
        .notEmpty()
        .withMessage('Role is required')
        .isIn(['member_full', 'member_read', 'owner', 'co_owner', 'guest'])
        .withMessage('Invalid role'),
    (0, express_validator_1.body)('organizationId')
        .trim()
        .notEmpty()
        .withMessage('Organization ID is required'),
    //validate,
];
