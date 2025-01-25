import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import spaceRoutes from './space.routes';
import cabinetRoutes from './cabinet.routes';
import approvalRoutes from './approval.routes';
import recordRoutes from './record.routes';

const router = Router();

// API version prefix
const API_VERSION = '/api/v1';

// Mount routes
router.use(`${API_VERSION}/auth`, authRoutes);
router.use(`${API_VERSION}/users`, userRoutes);
router.use(`${API_VERSION}/spaces`, spaceRoutes);
router.use(`${API_VERSION}/cabinets`, cabinetRoutes);
router.use(`${API_VERSION}/approvals`, approvalRoutes);
router.use(`${API_VERSION}/records`, recordRoutes);

// Health check endpoint
router.get(`${API_VERSION}/health`, (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router; 