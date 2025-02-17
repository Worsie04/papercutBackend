import { Router } from 'express';
import { SpaceController } from '../controllers/space.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { upload } from '../middlewares/upload.middleware';

const router = Router();

router.use(authenticate(['user', 'admin', 'super_admin']));

// Space routes 
router.get('/', SpaceController.getAllSpaces);
router.get('/available-users', SpaceController.getAvailableUsers);
router.post('/', upload.single('logo'), SpaceController.createSpace);
router.get('/:id', SpaceController.getSpace);
router.get('/:id/cabinets', SpaceController.getCabinets);

// Member management routes
router.post('/:id/members/invite', SpaceController.inviteMembers);
router.post('/:id/members', SpaceController.addMember);
router.delete('/:id/members/:userId', SpaceController.removeMember);
router.patch('/:id/members/:userId/role', SpaceController.updateMemberRole);

export default router; 