import { Router } from 'express';
import { SpaceController } from '../controllers/space.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { upload } from '../middlewares/upload.middleware';

const router = Router();

router.use(authenticate(['user', 'admin', 'super_admin']));

// Space routes 
router.get('/', SpaceController.getAllSpaces);
router.get('/available-users', SpaceController.getAvailableUsers);
router.get('/getByStatus', SpaceController.getSpacesByStatus);
// New endpoint for getting spaces created by the current user with a specific status
router.get('/my-spaces', SpaceController.getMySpacesByStatus);
// New endpoint for getting spaces waiting for the current user's approval
router.get('/waiting-for-my-approval', SpaceController.getSpacesWaitingForMyApproval);
// New endpoint for getting super users for approvers
router.get('/superusers', SpaceController.getSuperUsers);
router.post('/', upload.single('logo'), SpaceController.createSpace);
router.get('/:id', SpaceController.getSpace);
router.get('/:id/cabinets', SpaceController.getCabinets);
// New endpoint for getting reassignment history
router.get('/:id/reassignment-history', SpaceController.getReassignmentHistory);
// Delete a space
router.delete('/:id', SpaceController.deleteSpace);

// Member management routes
router.post('/:id/members/invite', SpaceController.inviteMembers);
router.post('/:id/members', SpaceController.addMember);
router.delete('/:id/members/:userId', SpaceController.removeMember);
router.patch('/:id/members/:userId/role', SpaceController.updateMemberRole);

// Approval management routes
router.post('/:id/reassign', SpaceController.reassignApproval);
router.post('/:id/resubmit', SpaceController.resubmitSpace);

export default router;