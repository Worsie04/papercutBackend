"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const record_controller_1 = require("../controllers/record.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const multer_1 = __importDefault(require("multer"));
const upload_middleware_1 = require("../middlewares/upload.middleware");
const router = (0, express_1.Router)();
// Configure multer for memory storage
const uploadMulter = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    }
});
// Apply auth middleware to all routes
router.use((0, auth_middleware_1.authenticate)('user'));
// Record routes
router.post('/', uploadMulter.any(), record_controller_1.RecordController.createRecord);
router.get('/', record_controller_1.RecordController.getRecordsByStatus);
router.get('/:id', record_controller_1.RecordController.getRecord);
router.get('/file/:filePath', record_controller_1.RecordController.getFileUrl);
router.put('/:id/update', uploadMulter.any(), record_controller_1.RecordController.updateRecord);
router.put('/:id/approve', uploadMulter.any(), record_controller_1.RecordController.approveRecord);
router.put('/:id/reject', uploadMulter.any(), record_controller_1.RecordController.rejectRecord);
router.delete('/:id', record_controller_1.RecordController.deleteRecord);
// File version routes
router.post('/:id/versions', auth_middleware_1.authenticate, upload_middleware_1.upload.single('file'), record_controller_1.RecordController.uploadNewVersion);
router.get('/:id/versions', auth_middleware_1.authenticate, record_controller_1.RecordController.getVersions);
router.delete('/:id/versions/:versionId', auth_middleware_1.authenticate, record_controller_1.RecordController.deleteVersion);
exports.default = router;
