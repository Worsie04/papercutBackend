import { Router } from 'express';
import { OrganizationMemberController } from '../controllers/organization-member.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { checkOrganizationPermissions } from '../middlewares/organization.middleware';

const router = Router({ mergeParams: true }); // mergeParams allows access to organizationId from parent router

// All routes require authentication
router.use(authenticate(['user', 'admin', 'super_admin', 'super_user']));

// Get user's organization (no organization check needed)
router.get('/user/:userId/organization', OrganizationMemberController.getUserOrganization);

// Routes below this line require organization access
router.use(checkOrganizationPermissions);

// Get organization members
router.get('/', OrganizationMemberController.getOrganizationMembers);

// Get organization users (includes user details)
router.get('/users', OrganizationMemberController.getOrganizationUsers);

// Add member to organization
router.post('/', authenticate(['admin', 'super_admin', 'super_user']), OrganizationMemberController.addMember);

// Update member
router.patch('/:userId', authenticate(['admin', 'super_admin', 'super_user']), OrganizationMemberController.updateMember);

// Remove member
router.delete('/:userId', authenticate(['admin', 'super_admin', 'super_user']), OrganizationMemberController.removeMember);

// Transfer ownership
router.post('/transfer-ownership', authenticate(['admin', 'super_admin']), OrganizationMemberController.transferOwnership);

// Check member permissions
router.post('/:userId/check-permissions', OrganizationMemberController.checkMemberPermissions);

export default router; 