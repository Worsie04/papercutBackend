import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { TwoFactorController } from '../controllers/twoFactor.controller';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createUserSchema, updateUserSchema, updateProfileSchema, updatePasswordSchema } from '../validators/user.validator';
import { AdminRole } from '../../models/admin.model';

const router = Router();
const twoFactorController = new TwoFactorController();

// Current user routes (only require authentication)
router.get('/me', authenticate(), UserController.getCurrentUser);
router.get('/me/checkAllTables', authenticate(), UserController.getUserWithRelatedData);
router.put('/me', authenticate(), validate(updateProfileSchema), UserController.updateProfile);
router.put('/me/password', authenticate(), validate(updatePasswordSchema), UserController.updatePassword);

// List users for frontend
router.get('/list', authenticate(), UserController.getUsers);
router.get('/reviewers', authenticate(), UserController.getReviewers);  
router.get('/approvers', authenticate(), UserController.getApprovers);  
router.get('/superusers', authenticate(), requireAdmin([AdminRole.SUPER_ADMIN, AdminRole.ADMIN]), UserController.getSuperUsers);

// Admin routes (require admin role)
router.get('/', authenticate(), requireAdmin([AdminRole.SUPER_ADMIN, AdminRole.ADMIN]), UserController.getUsers);
//router.post('/', authenticate(), requireAdmin([AdminRole.SUPER_ADMIN, AdminRole.ADMIN]), validate(createUserSchema), UserController.createUser);
router.post('/', authenticate(), requireAdmin([AdminRole.SUPER_ADMIN, AdminRole.ADMIN]), UserController.createUser);
router.get('/:id', authenticate(), requireAdmin([AdminRole.SUPER_ADMIN, AdminRole.ADMIN]), UserController.getUser);
router.put('/:id', authenticate(), validate(updateUserSchema), UserController.updateUser);
//router.delete('/:id', authenticate(), requireAdmin([AdminRole.SUPER_ADMIN, AdminRole.ADMIN]), UserController.deleteUser);
router.delete('/:id', authenticate(), UserController.deleteUser);
router.post('/:id/activate', authenticate(), requireAdmin([AdminRole.SUPER_ADMIN, AdminRole.ADMIN]), UserController.activateUser);
router.post('/:id/deactivate', authenticate(), requireAdmin([AdminRole.SUPER_ADMIN, AdminRole.ADMIN]), UserController.deactivateUser);
router.post('/:id/resend-verification', authenticate(), requireAdmin([AdminRole.SUPER_ADMIN, AdminRole.ADMIN]), UserController.resendVerification);

// 2FA routes
router.post('/me/2fa/setup', authenticate(), twoFactorController.setup);
router.post('/me/2fa/verify', authenticate(), twoFactorController.verify);
router.post('/me/2fa/disable', authenticate(), twoFactorController.disable);
router.get('/me/2fa/status', authenticate(), twoFactorController.getStatus);

// User routes
router.get('/:id/cabinets', UserController.getUserCabinets);
router.get('/:id/groups', UserController.getUserGroups);

export default router; 