import { Router } from 'express';
import { RoleController } from '../controllers/role.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const controller = new RoleController();

// Get all roles
router.get('/', authenticate(['admin', 'super_admin']), controller.getRoles);

// Get a specific role
router.get('/:id', authenticate(['admin', 'super_admin']), controller.getRole);

// Create a new role
router.post('/', authenticate(['admin', 'super_admin']), controller.createRole);

// Update a role
router.patch('/:id', authenticate(['admin', 'super_admin']), controller.updateRole);

// Delete a role
router.delete('/:id', authenticate(['admin', 'super_admin']), controller.deleteRole);

export default router; 