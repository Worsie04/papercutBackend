"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserSchema = exports.createUserSchema = void 0;
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
