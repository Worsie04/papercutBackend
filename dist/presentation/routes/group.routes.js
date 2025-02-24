"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const group_controller_1 = require("../controllers/group.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const validate_middleware_1 = require("../middlewares/validate.middleware");
const group_validator_1 = require("../validators/group.validator");
const router = (0, express_1.Router)();
router.use((0, auth_middleware_1.authenticate)('user'));
// Group routes
router.post('/', (0, validate_middleware_1.validate)(group_validator_1.createGroupSchema), group_controller_1.GroupController.createGroup);
router.post('/assign', (0, validate_middleware_1.validate)(group_validator_1.addUsersToGroupSchema), group_controller_1.GroupController.addUsersToGroup);
router.get('/organization/:organizationId', group_controller_1.GroupController.getGroups);
router.get('/:id', group_controller_1.GroupController.getGroupById);
router.put('/:id', (0, validate_middleware_1.validate)(group_validator_1.updateGroupSchema), group_controller_1.GroupController.updateGroup);
router.delete('/:id', group_controller_1.GroupController.deleteGroup);
router.post('/:groupId/members', (0, validate_middleware_1.validate)(group_validator_1.addUsersToSingleGroupSchema), group_controller_1.GroupController.addUsersToGroup);
router.delete('/:groupId/members', group_controller_1.GroupController.removeUsersFromGroup);
// Add new route for updating permissions
router.put('/:id/permissions', (0, auth_middleware_1.authenticate)('user'), group_controller_1.GroupController.updatePermissions);
exports.default = router;
