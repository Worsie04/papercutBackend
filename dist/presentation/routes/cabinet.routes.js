"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cabinet_controller_1 = require("../controllers/cabinet.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.use((0, auth_middleware_1.authenticate)('user'));
// Cabinet routes
router.post('/', cabinet_controller_1.CabinetController.createCabinet);
router.get('/approved', cabinet_controller_1.CabinetController.getApprovedCabinets);
router.get('/', cabinet_controller_1.CabinetController.getCabinets);
router.get('/:id', cabinet_controller_1.CabinetController.getCabinet);
exports.default = router;
