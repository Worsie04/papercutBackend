import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import spaceRoutes from './space.routes';
import approvalRoutes from './approval.routes';
import recordRoutes from './record.routes';
import worsieorganizationRoutes from './worsieorganization.routes';
import roleRoutes from './role.routes';
import groupRoutes from './group.routes';
import notificationRoutes from './notification.routes';
import fileRoutes from './file.routes';
import dashboardRoutes from './dashboard.routes';
import activityRoutes from './activity.routes';
import chatRoutes from './chat.routes';
import searchRoutes from './search.routes';
import referenceRoutes from './reference.routes';
import templateRoutes from './template.routes';
import letterRoutes from './letter.routes';
import uploadRoutes from './upload.routes';
import publicLetterRoutes from './publicLetter.routes';

const router = Router();

router.use('/public/letters', publicLetterRoutes);

// API version prefix
const API_VERSION = '/api/v1';

// Mount routes
router.use(`${API_VERSION}/auth`, authRoutes);
router.use(`${API_VERSION}/users`, userRoutes);
router.use(`${API_VERSION}/spaces`, spaceRoutes);
router.use(`${API_VERSION}/approvals`, approvalRoutes);
router.use(`${API_VERSION}/records`, recordRoutes);
router.use(`${API_VERSION}/organizations`, worsieorganizationRoutes);
router.use(`${API_VERSION}/roles`, roleRoutes);
router.use(`${API_VERSION}/groups`, groupRoutes);
router.use(`${API_VERSION}/notifications`, notificationRoutes);
router.use(`${API_VERSION}/files`, fileRoutes);
router.use(`${API_VERSION}/dashboard`, dashboardRoutes);
router.use(`${API_VERSION}/activities`, activityRoutes);
router.use(`${API_VERSION}/chat`, chatRoutes);
router.use(`${API_VERSION}/search`, searchRoutes);
router.use(`${API_VERSION}/references`, referenceRoutes);
router.use(`${API_VERSION}/templates`, templateRoutes);
router.use(`${API_VERSION}/letters`, letterRoutes);
router.use(`${API_VERSION}/uploads`, uploadRoutes);


// Health check endpoint
router.get(`${API_VERSION}/health`, (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;