"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const space_controller_1 = require("../controllers/space.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const upload_middleware_1 = require("../middlewares/upload.middleware");
const router = (0, express_1.Router)();
// Group routes by feature and apply middleware more efficiently
const authenticatedRouter = (0, express_1.Router)();
authenticatedRouter.use((0, auth_middleware_1.authenticate)(['user', 'admin', 'super_admin']));
// Group related routes
const memberRoutes = (0, express_1.Router)();
const approvalRoutes = (0, express_1.Router)();
// Space core routes
authenticatedRouter
    .route('/')
    .get(space_controller_1.SpaceController.getAllSpaces)
    .post(upload_middleware_1.upload.single('logo'), space_controller_1.SpaceController.createSpace);
// Space query routes
authenticatedRouter
    .get('/available-users', space_controller_1.SpaceController.getAvailableUsers)
    .get('/getByStatus', space_controller_1.SpaceController.getSpacesByStatus)
    .get('/my-spaces', space_controller_1.SpaceController.getMySpacesByStatus)
    .get('/waiting-for-my-approval', space_controller_1.SpaceController.getSpacesWaitingForMyApproval)
    .get('/superusers', space_controller_1.SpaceController.getSuperUsers);
// Member management routes
memberRoutes
    .post('/:id/members/invite', space_controller_1.SpaceController.inviteMembers)
    .post('/:id/members', space_controller_1.SpaceController.addMember)
    .delete('/:id/members/:userId', space_controller_1.SpaceController.removeMember)
    .patch('/:id/members/:userId/role', space_controller_1.SpaceController.updateMemberRole);
// Approval management routes
approvalRoutes
    .post('/:id/reassign', space_controller_1.SpaceController.reassignApproval)
    .post('/:id/resubmit', space_controller_1.SpaceController.resubmitSpace);
// Space specific routes
authenticatedRouter
    .get('/:id', space_controller_1.SpaceController.getSpace)
    .get('/:id/cabinets', space_controller_1.SpaceController.getCabinets)
    .get('/:id/reassignment-history', space_controller_1.SpaceController.getReassignmentHistory)
    .delete('/:id', space_controller_1.SpaceController.deleteSpace);
// Mount sub-routers
authenticatedRouter.use('/', memberRoutes);
authenticatedRouter.use('/', approvalRoutes);
// Mount main router
router.use('/', authenticatedRouter);
exports.default = router;
