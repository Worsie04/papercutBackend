"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const role_controller_1 = require("../controllers/role.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
const controller = new role_controller_1.RoleController();
// Get all roles
router.get('/', (0, auth_middleware_1.authenticate)(['admin', 'super_admin']), controller.getRoles);
// Get a specific role
router.get('/:id', (0, auth_middleware_1.authenticate)(['admin', 'super_admin']), controller.getRole);
// Create a new role
router.post('/', (0, auth_middleware_1.authenticate)(['admin', 'super_admin']), controller.createRole);
// Update a role
router.patch('/:id', (0, auth_middleware_1.authenticate)(['admin', 'super_admin']), controller.updateRole);
// Delete a role
router.delete('/:id', (0, auth_middleware_1.authenticate)(['admin', 'super_admin']), controller.deleteRole);
exports.default = router;
