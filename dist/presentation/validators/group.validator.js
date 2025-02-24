"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addUsersToSingleGroupSchema = exports.addUsersToGroupSchema = exports.updateGroupSchema = exports.createGroupSchema = void 0;
const zod_1 = require("zod");
exports.createGroupSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Name is required'),
        description: zod_1.z.string().optional(),
        organizationId: zod_1.z.string().min(1, 'Organization ID is required')
    })
});
exports.updateGroupSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().uuid('Invalid group ID'),
    }),
    body: zod_1.z.object({
        name: zod_1.z.string().optional(),
        description: zod_1.z.string().optional()
    })
});
// Schema for /assign endpoint
exports.addUsersToGroupSchema = zod_1.z.object({
    body: zod_1.z.object({
        userIds: zod_1.z.array(zod_1.z.string().uuid('Invalid user ID')),
        groupIds: zod_1.z.array(zod_1.z.string().uuid('Invalid group ID')),
        organizationId: zod_1.z.string().uuid('Invalid organization ID')
    }).strict()
});
// Separate schema for /:groupId/members endpoint
exports.addUsersToSingleGroupSchema = zod_1.z.object({
    params: zod_1.z.object({
        groupId: zod_1.z.string().uuid('Invalid group ID')
    }),
    body: zod_1.z.object({
        userIds: zod_1.z.array(zod_1.z.string().uuid('Invalid user ID'))
    }).strict()
});
