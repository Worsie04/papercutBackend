import { Router } from 'express';
import { ActivityController } from '../controllers/activity.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticate('user'));

// Route to get recent activities for the authenticated user
router.get('/recent', ActivityController.getRecentActivities);

// Route to get activities for an organization
router.get('/organization', authenticate, ActivityController.getOrganizationActivities);

// Routes for specific resource activities
router.get('/spaces/:id', authenticate, ActivityController.getSpaceActivities);
router.get('/cabinets/:id', authenticate, ActivityController.getCabinetActivities);
router.get('/records/:id', authenticate, ActivityController.getRecordActivities);

export default router;