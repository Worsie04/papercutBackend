"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const twoFactor_controller_1 = require("../controllers/twoFactor.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const validate_middleware_1 = require("../middlewares/validate.middleware");
const user_validator_1 = require("../validators/user.validator");
const admin_model_1 = require("../../models/admin.model");
const router = (0, express_1.Router)();
const twoFactorController = new twoFactor_controller_1.TwoFactorController();
// Current user routes (only require authentication)
router.get('/me', (0, auth_middleware_1.authenticate)(), (0, validate_middleware_1.validate)(user_validator_1.updateProfileSchema), user_controller_1.UserController.getCurrentUser);
router.get('/me/checkAllTables', (0, auth_middleware_1.authenticate)(), user_controller_1.UserController.getUserWithRelatedData);
router.put('/me', (0, auth_middleware_1.authenticate)(), (0, validate_middleware_1.validate)(user_validator_1.updateProfileSchema), user_controller_1.UserController.updateProfile);
router.put('/me/password', (0, auth_middleware_1.authenticate)(), (0, validate_middleware_1.validate)(user_validator_1.updatePasswordSchema), user_controller_1.UserController.updatePassword);
// List users for frontend
router.get('/list', (0, auth_middleware_1.authenticate)(), user_controller_1.UserController.getUsers);
router.get('/reviewers', user_controller_1.UserController.getReviewers);
router.get('/approvers', user_controller_1.UserController.getApprovers);
router.get('/superusers', (0, auth_middleware_1.authenticate)(), (0, auth_middleware_1.requireAdmin)([admin_model_1.AdminRole.SUPER_ADMIN, admin_model_1.AdminRole.ADMIN]), user_controller_1.UserController.getSuperUsers);
// Admin routes (require admin role)
router.get('/', (0, auth_middleware_1.authenticate)(), user_controller_1.UserController.getUsers);
//router.post('/', authenticate(), requireAdmin([AdminRole.SUPER_ADMIN, AdminRole.ADMIN]), validate(createUserSchema), UserController.createUser);
router.post('/', (0, auth_middleware_1.authenticate)(), (0, auth_middleware_1.requireAdmin)([admin_model_1.AdminRole.SUPER_ADMIN, admin_model_1.AdminRole.ADMIN]), user_controller_1.UserController.createUser);
router.get('/:id', (0, auth_middleware_1.authenticate)(), (0, auth_middleware_1.requireAdmin)([admin_model_1.AdminRole.SUPER_ADMIN, admin_model_1.AdminRole.ADMIN]), user_controller_1.UserController.getUser);
router.put('/:id', (0, auth_middleware_1.authenticate)(), (0, validate_middleware_1.validate)(user_validator_1.updateUserSchema), user_controller_1.UserController.updateUser);
//router.delete('/:id', authenticate(), requireAdmin([AdminRole.SUPER_ADMIN, AdminRole.ADMIN]), UserController.deleteUser);
router.delete('/:id', (0, auth_middleware_1.authenticate)(), user_controller_1.UserController.deleteUser);
router.post('/:id/activate', (0, auth_middleware_1.authenticate)(), (0, auth_middleware_1.requireAdmin)([admin_model_1.AdminRole.SUPER_ADMIN, admin_model_1.AdminRole.ADMIN]), user_controller_1.UserController.activateUser);
router.post('/:id/deactivate', (0, auth_middleware_1.authenticate)(), (0, auth_middleware_1.requireAdmin)([admin_model_1.AdminRole.SUPER_ADMIN, admin_model_1.AdminRole.ADMIN]), user_controller_1.UserController.deactivateUser);
router.post('/:id/resend-verification', (0, auth_middleware_1.authenticate)(), (0, auth_middleware_1.requireAdmin)([admin_model_1.AdminRole.SUPER_ADMIN, admin_model_1.AdminRole.ADMIN]), user_controller_1.UserController.resendVerification);
// 2FA routes
router.post('/me/2fa/setup', (0, auth_middleware_1.authenticate)(), twoFactorController.setup);
router.post('/me/2fa/verify', (0, auth_middleware_1.authenticate)(), twoFactorController.verify);
router.post('/me/2fa/disable', (0, auth_middleware_1.authenticate)(), twoFactorController.disable);
router.get('/me/2fa/status', (0, auth_middleware_1.authenticate)(), twoFactorController.getStatus);
// User routes
router.get('/:id/cabinets', user_controller_1.UserController.getUserCabinets);
router.get('/:id/groups', user_controller_1.UserController.getUserGroups);
exports.default = router;
