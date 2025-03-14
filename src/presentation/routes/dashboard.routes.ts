import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticate('user'));

// Dashboard statistics endpoint
router.get('/stats', DashboardController.getDashboardStats);

export default router; 