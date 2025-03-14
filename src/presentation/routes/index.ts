import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import spaceRoutes from './space.routes';
import cabinetRoutes from './cabinet.routes';
import cabinetMemberRoutes from './cabinet-member.routes';
import approvalRoutes from './approval.routes';
import recordRoutes from './record.routes';
import worsieorganizationRoutes from './worsieorganization.routes';
import roleRoutes from './role.routes';
import groupRoutes from './group.routes';
import notificationRoutes from './notification.routes';
import fileRoutes from './file.routes';
import dashboardRoutes from './dashboard.routes';

const router = Router();

// API version prefix
const API_VERSION = '/api/v1';

// Mount routes
router.use(`${API_VERSION}/auth`, authRoutes);
router.use(`${API_VERSION}/users`, userRoutes);
router.use(`${API_VERSION}/spaces`, spaceRoutes);
router.use(`${API_VERSION}/cabinets`, cabinetRoutes);
router.use(`${API_VERSION}/cabinet-members`, cabinetMemberRoutes);
router.use(`${API_VERSION}/approvals`, approvalRoutes);
router.use(`${API_VERSION}/records`, recordRoutes);
router.use(`${API_VERSION}/organizations`, worsieorganizationRoutes);
router.use(`${API_VERSION}/roles`, roleRoutes);
router.use(`${API_VERSION}/groups`, groupRoutes);
router.use(`${API_VERSION}/notifications`, notificationRoutes);
router.use(`${API_VERSION}/files`, fileRoutes);
router.use(`${API_VERSION}/dashboard`, dashboardRoutes);

// Health check endpoint
router.get(`${API_VERSION}/health`, (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;