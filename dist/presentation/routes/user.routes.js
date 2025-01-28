"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const validate_middleware_1 = require("../middlewares/validate.middleware");
const user_validator_1 = require("../validators/user.validator");
const admin_model_1 = require("../../models/admin.model");
const router = (0, express_1.Router)();
// All routes require authentication and admin privileges
router.use((0, auth_middleware_1.authenticate)());
router.use((0, auth_middleware_1.requireAdmin)([admin_model_1.AdminRole.SUPER_ADMIN, admin_model_1.AdminRole.ADMIN]));
// CRUD operations
router.get('/', user_controller_1.UserController.getUsers);
router.get('/:id', user_controller_1.UserController.getUser);
router.post('/', (0, validate_middleware_1.validate)(user_validator_1.createUserSchema), user_controller_1.UserController.createUser);
router.put('/:id', (0, validate_middleware_1.validate)(user_validator_1.updateUserSchema), user_controller_1.UserController.updateUser);
router.delete('/:id', user_controller_1.UserController.deleteUser);
// Additional operations
router.post('/:id/activate', user_controller_1.UserController.activateUser);
router.post('/:id/deactivate', user_controller_1.UserController.deactivateUser);
router.post('/:id/resend-verification', user_controller_1.UserController.resendVerification);
exports.default = router;
