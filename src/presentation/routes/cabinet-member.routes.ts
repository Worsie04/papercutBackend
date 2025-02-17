import { Router } from 'express';
import { CabinetMemberController } from '../controllers/cabinet-member.controller';
import { authenticate, requireActive } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { z } from 'zod';

const router = Router();

// Validation schemas
const assignUsersSchema = z.object({
  cabinetIds: z.array(z.string().uuid('Invalid cabinet ID')).min(1, 'At least one cabinet must be selected'),
  userIds: z.array(z.string().uuid('Invalid user ID')).min(1, 'At least one user must be selected'),
  permissions: z.object({
    canRead: z.boolean().optional(),
    canWrite: z.boolean().optional(),
    canDelete: z.boolean().optional(),
    canShare: z.boolean().optional(),
  }).optional(),
});

const updatePermissionsSchema = z.object({
  permissions: z.object({
    canRead: z.boolean().optional(),
    canWrite: z.boolean().optional(),
    canDelete: z.boolean().optional(),
    canShare: z.boolean().optional(),
  }),
});

// Routes
router.post(
  '/assign',
  authenticate(),
  requireActive,
  validate(assignUsersSchema),
  CabinetMemberController.assignUsers
);

router.get(
  '/cabinets/:cabinetId/members',
  authenticate(),
  requireActive,
  CabinetMemberController.getCabinetMembers
);

router.get(
  '/users/:userId/cabinets',
  authenticate(),
  requireActive,
  CabinetMemberController.getUserCabinets
);

router.patch(
  '/cabinets/:cabinetId/members/:userId/permissions',
  authenticate(),
  requireActive,
  validate(updatePermissionsSchema),
  CabinetMemberController.updateMemberPermissions
);

router.delete(
  '/cabinets/:cabinetId/members/:userId',
  authenticate(),
  requireActive,
  CabinetMemberController.removeMember
);

router.get(
  '/cabinets/:cabinetId/members/:userId/permissions',
  authenticate(),
  requireActive,
  CabinetMemberController.getMemberPermissions
);

router.get(
  '/cabinets/:cabinetId/members/:userId/access',
  authenticate(),
  requireActive,
  CabinetMemberController.checkMemberAccess
);

router.get(
  '/cabinets/:cabinetId/members/:userId',
  authenticate(),
  requireActive,
  CabinetMemberController.getMember
);

export default router; 