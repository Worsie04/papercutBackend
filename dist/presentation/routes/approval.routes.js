"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const approval_controller_1 = require("../controllers/approval.controller");
const space_comment_controller_1 = require("../controllers/space-comment.controller");
const router = (0, express_1.Router)();
router.use((0, auth_middleware_1.authenticate)('user'));
// Approval routes
router.get('/', approval_controller_1.ApprovalController.getApprovals);
// New endpoint for getting the current user's pending approvals
router.get('/my-pending', approval_controller_1.ApprovalController.getMyPendingApprovals);
// New endpoint for getting approvals waiting for the current user
router.get('/waiting-for-me', approval_controller_1.ApprovalController.getApprovalsWaitingForMe);
router.post('/:id/approve', approval_controller_1.ApprovalController.approveRequest);
router.post('/:id/reject', approval_controller_1.ApprovalController.rejectRequest);
// Comment routes
router.post('/:id/comment', space_comment_controller_1.SpaceCommentController.addComment);
router.get('/:id/comments', space_comment_controller_1.SpaceCommentController.getComments);
router.delete('/comments/:commentId', space_comment_controller_1.SpaceCommentController.deleteComment);
exports.default = router;
