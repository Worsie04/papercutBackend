"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cabinet_controller_1 = require("../controllers/cabinet.controller");
const cabinet_follower_controller_1 = require("../controllers/cabinet-follower.controller");
const record_controller_1 = require("../controllers/record.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
const cabinetFollowerController = new cabinet_follower_controller_1.CabinetFollowerController();
router.use((0, auth_middleware_1.authenticate)('user'));
// Cabinet routes
router.post('/', cabinet_controller_1.CabinetController.createCabinet);
router.get('/approved', cabinet_controller_1.CabinetController.getApprovedCabinets);
router.get('/followedCabinets', cabinetFollowerController.getFollowedCabinets);
// New endpoint for getting cabinets created by the current user with a specific status
router.get('/my-cabinets', cabinet_controller_1.CabinetController.getMyCabinetsByStatus);
// New endpoint for getting cabinets waiting for the current user's approval
router.get('/waiting-for-my-approval', cabinet_controller_1.CabinetController.getCabinetsWaitingForMyApproval);
router.get('/', cabinet_controller_1.CabinetController.getCabinets);
router.post('/assign', cabinet_controller_1.CabinetController.assignCabinetsToUsers);
router.post('/assign-with-permissions', cabinet_controller_1.CabinetController.assignUsersWithPermissions);
// Cabinet ID specific routes
router.get('/:id', cabinet_controller_1.CabinetController.getCabinet);
router.put('/:id', cabinet_controller_1.CabinetController.updateCabinet);
router.post('/:id/approve', cabinet_controller_1.CabinetController.approveCabinet);
router.post('/:id/reject', cabinet_controller_1.CabinetController.rejectCabinet);
router.delete('/:id', cabinet_controller_1.CabinetController.deleteCabinet);
router.post('/:id/reassign', cabinet_controller_1.CabinetController.reassignCabinet);
// Record routes
router.get('/:cabinetId/records', record_controller_1.RecordController.getCabinetRecords);
// Follow/unfollow routes
router.post('/:cabinetId/follow', cabinetFollowerController.followCabinet);
router.delete('/:cabinetId/follow', cabinetFollowerController.unfollowCabinet);
router.get('/:cabinetId/follow', cabinetFollowerController.isFollowing);
router.get('/:cabinetId/followers', cabinetFollowerController.getCabinetFollowers);
exports.default = router;
