"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const record_controller_1 = require("../controllers/record.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Apply auth middleware to all routes
router.use((0, auth_middleware_1.authenticate)('user'));
// Record routes
router.post('/', record_controller_1.RecordController.createRecord);
router.get('/:id', record_controller_1.RecordController.getRecord);
router.put('/:id', record_controller_1.RecordController.updateRecord);
router.delete('/:id', record_controller_1.RecordController.deleteRecord);
router.get('/', record_controller_1.RecordController.getRecordsByStatus);
exports.default = router;
