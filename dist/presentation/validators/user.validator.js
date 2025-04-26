"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePasswordSchema = exports.updateProfileSchema = exports.updateUserSchema = exports.createUserSchema = void 0;
const zod_1 = require("zod");
exports.createUserSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
    firstName: zod_1.z.string().min(2, 'First name must be at least 2 characters'),
    lastName: zod_1.z.string().min(2, 'Last name must be at least 2 characters'),
    phone: zod_1.z.string().optional(),
    isActive: zod_1.z.boolean().optional().default(true),
});
exports.updateUserSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format').optional(),
    firstName: zod_1.z.string().min(2, 'First name must be at least 2 characters').optional(),
    lastName: zod_1.z.string().min(2, 'Last name must be at least 2 characters').optional(),
    phone: zod_1.z.string().optional(),
    isActive: zod_1.z.boolean().optional(),
});
exports.updateProfileSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(2, 'First name requires at least 2 characters').max(50).optional(),
    lastName: zod_1.z.string().min(2, 'Last name requires at least 2 characters').max(50).optional(),
    phone: zod_1.z.string()
        .regex(/^\+?[\d\s()-]+$/, { message: "Invalid phone number format" })
        .max(25, 'Phone number too long')
        .optional()
        .nullable(), // Allow null or undefined
    company: zod_1.z.string()
        .max(100, 'Company name cannot exceed 100 characters')
        .optional()
        .nullable(), // Allow null or undefined
    timeZone: zod_1.z.string()
        .max(100, 'Time zone name cannot exceed 100 characters')
        .optional()
        .nullable(), // Allow null or undefined
    avatar: zod_1.z.string()
        .url({ message: "Invalid URL format for avatar" })
        .max(512, 'Avatar URL too long')
        .optional()
        .nullable(), // Allow null or undefined
});
exports.updatePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1, 'Current password is required'), // Use min(1) for required check
    newPassword: zod_1.z.string().min(8, 'New password must be at least 8 characters'),
});
