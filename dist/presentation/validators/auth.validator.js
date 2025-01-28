"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyEmailSchema = exports.forgotPasswordSchema = exports.resetPasswordSchema = exports.changePasswordSchema = exports.refreshTokenSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
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
