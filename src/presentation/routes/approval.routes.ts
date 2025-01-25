import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { ApprovalController } from '../controllers/approval.controller';

const router = Router();

router.use(authenticate('user'));

// Approval routes
router.get('/', ApprovalController.getApprovals);
router.post('/:id/approve', ApprovalController.approveRequest);
router.post('/:id/reject', ApprovalController.rejectRequest);

export default router; 