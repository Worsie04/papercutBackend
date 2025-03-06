import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { ApprovalController } from '../controllers/approval.controller';
import { SpaceCommentController } from '../controllers/space-comment.controller';

const router = Router();

router.use(authenticate('user'));

// Approval routes
router.get('/', ApprovalController.getApprovals);
// New endpoint for getting the current user's pending approvals
router.get('/my-pending', ApprovalController.getMyPendingApprovals);
// New endpoint for getting approvals waiting for the current user
router.get('/waiting-for-me', ApprovalController.getApprovalsWaitingForMe);
router.post('/:id/approve', ApprovalController.approveRequest);
router.post('/:id/reject', ApprovalController.rejectRequest);

// Comment routes
router.post('/:id/comment', SpaceCommentController.addComment);
router.get('/:id/comments', SpaceCommentController.getComments);
router.delete('/comments/:commentId', SpaceCommentController.deleteComment);

export default router;