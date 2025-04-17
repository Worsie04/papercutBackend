"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboard_controller_1 = require("../controllers/dashboard.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Apply auth middleware to all routes
router.use((0, auth_middleware_1.authenticate)('user'));
// Dashboard statistics endpoint
router.get('/stats', dashboard_controller_1.DashboardController.getDashboardStats);
exports.default = router;
