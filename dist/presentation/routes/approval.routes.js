"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const approval_controller_1 = require("../controllers/approval.controller");
const router = (0, express_1.Router)();
router.use((0, auth_middleware_1.authenticate)('user'));
// Approval routes
router.get('/', approval_controller_1.ApprovalController.getApprovals);
router.post('/:id/approve', approval_controller_1.ApprovalController.approveRequest);
router.post('/:id/reject', approval_controller_1.ApprovalController.rejectRequest);
exports.default = router;
