import { Router } from 'express';
import { GroupController } from '../controllers/group.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { 
  createGroupSchema, 
  updateGroupSchema, 
  addUsersToGroupSchema,
  addUsersToSingleGroupSchema 
} from '../validators/group.validator';
import { Request, Response } from 'express';

const router = Router();

router.use(authenticate('user'));

// Group routes
router.post('/', validate(createGroupSchema), GroupController.createGroup);
router.post('/assign', validate(addUsersToGroupSchema), GroupController.addUsersToGroup);
router.get('/organization/:organizationId', GroupController.getGroups);
router.get('/:id', GroupController.getGroupById);
router.put('/:id', validate(updateGroupSchema), GroupController.updateGroup);
router.delete('/:id', GroupController.deleteGroup);
router.post('/:groupId/members', validate(addUsersToSingleGroupSchema), GroupController.addUsersToGroup);
router.delete('/:groupId/members', GroupController.removeUsersFromGroup);

// Add new route for updating permissions
router.put(
  '/:id/permissions',
  authenticate('user'),
  GroupController.updatePermissions
);

export default router; 