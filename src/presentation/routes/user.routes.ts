import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createUserSchema, updateUserSchema } from '../validators/user.validator';
import { AdminRole } from '../../models/admin.model';

const router = Router();

// All routes require authentication and admin privileges
router.use(authenticate());
router.use(requireAdmin([AdminRole.SUPER_ADMIN, AdminRole.ADMIN]));

// CRUD operations
router.get('/', UserController.getUsers);
router.get('/:id', UserController.getUser);
router.post('/', validate(createUserSchema), UserController.createUser);
router.put('/:id', validate(updateUserSchema), UserController.updateUser);
router.delete('/:id', UserController.deleteUser);

// Additional operations
router.post('/:id/activate', UserController.activateUser);
router.post('/:id/deactivate', UserController.deactivateUser);
router.post('/:id/resend-verification', UserController.resendVerification);

export default router; 