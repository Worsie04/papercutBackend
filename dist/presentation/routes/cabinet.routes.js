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
router.get('/', cabinet_controller_1.CabinetController.getCabinets);
router.post('/assign', cabinet_controller_1.CabinetController.assignCabinetsToUsers);
router.post('/assign-with-permissions', cabinet_controller_1.CabinetController.assignUsersWithPermissions);
// Cabinet ID specific routes
router.get('/:id', cabinet_controller_1.CabinetController.getCabinet);
router.post('/:id/approve', cabinet_controller_1.CabinetController.approveCabinet);
router.post('/:id/reject', cabinet_controller_1.CabinetController.rejectCabinet);
// Record routes
router.get('/:cabinetId/records', record_controller_1.RecordController.getCabinetRecords);
// Follow/unfollow routes
router.post('/:cabinetId/follow', cabinetFollowerController.followCabinet);
router.delete('/:cabinetId/follow', cabinetFollowerController.unfollowCabinet);
router.get('/:cabinetId/follow', cabinetFollowerController.isFollowing);
router.get('/:cabinetId/followers', cabinetFollowerController.getCabinetFollowers);
exports.default = router;
