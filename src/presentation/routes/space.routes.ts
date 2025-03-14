import { Router } from 'express';
import { SpaceController } from '../controllers/space.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { upload } from '../middlewares/upload.middleware';

const router = Router();

// Group routes by feature and apply middleware more efficiently
const authenticatedRouter = Router();
authenticatedRouter.use(authenticate(['user', 'admin', 'super_admin']));

// Group related routes
const memberRoutes = Router();
const approvalRoutes = Router();

// Space core routes
authenticatedRouter
  .route('/')
  .get(SpaceController.getAllSpaces)
  .post(upload.single('logo'), SpaceController.createSpace);

// Space query routes
authenticatedRouter
  .get('/available-users', SpaceController.getAvailableUsers)
  .get('/getByStatus', SpaceController.getSpacesByStatus)
  .get('/my-spaces', SpaceController.getMySpacesByStatus)
  .get('/waiting-for-my-approval', SpaceController.getSpacesWaitingForMyApproval)
  .get('/superusers', SpaceController.getSuperUsers);

// Member management routes
memberRoutes
  .post('/:id/members/invite', SpaceController.inviteMembers)
  .post('/:id/members', SpaceController.addMember)
  .delete('/:id/members/:userId', SpaceController.removeMember)
  .patch('/:id/members/:userId/role', SpaceController.updateMemberRole);

// Approval management routes
approvalRoutes
  .post('/:id/reassign', SpaceController.reassignApproval)
  .post('/:id/resubmit', SpaceController.resubmitSpace);

// Space specific routes
authenticatedRouter
  .get('/:id', SpaceController.getSpace)
  .get('/:id/cabinets', SpaceController.getCabinets)
  .get('/:id/reassignment-history', SpaceController.getReassignmentHistory)
  .delete('/:id', SpaceController.deleteSpace);

// Mount sub-routers
authenticatedRouter.use('/', memberRoutes);
authenticatedRouter.use('/', approvalRoutes);

// Mount main router
router.use('/', authenticatedRouter);

export default router;
