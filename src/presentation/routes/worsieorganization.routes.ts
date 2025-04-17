import { Router } from 'express';
import { OrganizationController } from '../controllers/organization.controller';
import { authenticate } from '../middlewares/auth.middleware';
import organizationMemberRoutes from './organization-member.routes';

const router = Router();

router.use(authenticate(['admin', 'super_admin', 'super_user', 'user']));

router.post('/', authenticate(['admin', 'super_admin']), OrganizationController.createOrganization);

router.get('/', OrganizationController.getOrganizations);

router.get('/user', authenticate(['user', 'admin', 'super_admin', 'super_user']), OrganizationController.getUserOrganizations);

router.get('/findDomainByUserId/:userId', authenticate(['user', 'admin', 'super_admin', 'super_user']), OrganizationController.findDomainByUserId);

router.get('/:id', authenticate(['admin', 'super_admin', 'super_user']), OrganizationController.getOrganization);

router.patch('/:id', authenticate(['admin', 'super_admin']), OrganizationController.updateOrganization);

router.delete('/:id', authenticate('super_admin'), OrganizationController.deleteOrganization);

router.use('/:organizationId/members', organizationMemberRoutes);

export default router;