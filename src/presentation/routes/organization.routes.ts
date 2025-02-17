import { Router } from 'express';
import { OrganizationController } from '../controllers/organization.controller';
import { authenticate } from '../middlewares/auth.middleware';
import organizationMemberRoutes from './organization-member.routes';

const router = Router();

// All routes require admin or super_admin authentication by default
router.use(authenticate(['admin', 'super_admin', 'super_user', 'user']));

// Organization routes
// Create organization (admin and super_admin)
router.post('/', authenticate(['admin', 'super_admin']), OrganizationController.createOrganization);

// Get all organizations (admin and super_admin)
router.get('/', authenticate(['admin', 'super_admin']), OrganizationController.getOrganizations);

// Get user's organizations (available to all authenticated users)
router.get('/user', authenticate(['user', 'admin', 'super_admin', 'super_user']), OrganizationController.getUserOrganizations);

router.get('/findDomainByUserId/:userId', authenticate(['user', 'admin', 'super_admin', 'super_user']), OrganizationController.findDomainByUserId);

// Get specific organization (admin and super_admin)
router.get('/:id', authenticate(['admin', 'super_admin', 'super_user']), OrganizationController.getOrganization);

// Update organization (admin and super_admin)
router.patch('/:id', authenticate(['admin', 'super_admin']), OrganizationController.updateOrganization);

// Delete organization (super_admin only)
router.delete('/:id', authenticate('super_admin'), OrganizationController.deleteOrganization);

// Organization member management routes
// Allow access to organization members
router.use('/:organizationId/members', organizationMemberRoutes);

export default router;