"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const activity_controller_1 = require("../controllers/activity.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.use((0, auth_middleware_1.authenticate)('user'));
// Route to get recent activities for the authenticated user
router.get('/recent', activity_controller_1.ActivityController.getRecentActivities);
// Route to get activities for an organization
router.get('/organization', auth_middleware_1.authenticate, activity_controller_1.ActivityController.getOrganizationActivities);
// Routes for specific resource activities
router.get('/spaces/:id', auth_middleware_1.authenticate, activity_controller_1.ActivityController.getSpaceActivities);
router.get('/cabinets/:id', auth_middleware_1.authenticate, activity_controller_1.ActivityController.getCabinetActivities);
router.get('/records/:id', auth_middleware_1.authenticate, activity_controller_1.ActivityController.getRecordActivities);
exports.default = router;
