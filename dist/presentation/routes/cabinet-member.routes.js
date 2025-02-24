"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cabinet_member_controller_1 = require("../controllers/cabinet-member.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const validate_middleware_1 = require("../middlewares/validate.middleware");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
// Validation schemas
const assignUsersSchema = zod_1.z.object({
    cabinetIds: zod_1.z.array(zod_1.z.string().uuid('Invalid cabinet ID')).min(1, 'At least one cabinet must be selected'),
    userIds: zod_1.z.array(zod_1.z.string().uuid('Invalid user ID')).min(1, 'At least one user must be selected'),
    permissions: zod_1.z.object({
        canRead: zod_1.z.boolean().optional(),
        canWrite: zod_1.z.boolean().optional(),
        canDelete: zod_1.z.boolean().optional(),
        canShare: zod_1.z.boolean().optional(),
    }).optional(),
});
const updatePermissionsSchema = zod_1.z.object({
    permissions: zod_1.z.object({
        canRead: zod_1.z.boolean().optional(),
        canWrite: zod_1.z.boolean().optional(),
        canDelete: zod_1.z.boolean().optional(),
        canShare: zod_1.z.boolean().optional(),
    }),
});
// Routes
router.post('/assign', (0, auth_middleware_1.authenticate)(), auth_middleware_1.requireActive, (0, validate_middleware_1.validate)(assignUsersSchema), cabinet_member_controller_1.CabinetMemberController.assignUsers);
router.get('/cabinets/:cabinetId/members', (0, auth_middleware_1.authenticate)(), auth_middleware_1.requireActive, cabinet_member_controller_1.CabinetMemberController.getCabinetMembers);
router.get('/users/:userId/cabinets', (0, auth_middleware_1.authenticate)(), auth_middleware_1.requireActive, cabinet_member_controller_1.CabinetMemberController.getUserCabinets);
router.patch('/cabinets/:cabinetId/members/:userId/permissions', (0, auth_middleware_1.authenticate)(), auth_middleware_1.requireActive, (0, validate_middleware_1.validate)(updatePermissionsSchema), cabinet_member_controller_1.CabinetMemberController.updateMemberPermissions);
router.delete('/cabinets/:cabinetId/members/:userId', (0, auth_middleware_1.authenticate)(), auth_middleware_1.requireActive, cabinet_member_controller_1.CabinetMemberController.removeMember);
router.get('/cabinets/:cabinetId/members/:userId/permissions', (0, auth_middleware_1.authenticate)(), auth_middleware_1.requireActive, cabinet_member_controller_1.CabinetMemberController.getMemberPermissions);
router.get('/cabinets/:cabinetId/members/:userId/access', (0, auth_middleware_1.authenticate)(), auth_middleware_1.requireActive, cabinet_member_controller_1.CabinetMemberController.checkMemberAccess);
router.get('/cabinets/:cabinetId/members/:userId', (0, auth_middleware_1.authenticate)(), auth_middleware_1.requireActive, cabinet_member_controller_1.CabinetMemberController.getMember);
exports.default = router;
