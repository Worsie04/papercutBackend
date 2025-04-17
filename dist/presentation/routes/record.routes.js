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
// Centralize multer configuration
const uploadMulter = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 5 // Limit to 5 files
    },
    fileFilter: (req, file, cb) => {
        // File type validation
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
        if (!allowedTypes.includes(file.mimetype)) {
            cb(new Error('Invalid file type'));
            return;
        }
        cb(null, true);
    }
});
// Group routes by feature
router.use((0, auth_middleware_1.authenticate)(['user', 'admin', 'super_admin']));
// Create route groups
const recordRoutes = (0, express_1.Router)();
const fileRoutes = (0, express_1.Router)();
const versionRoutes = (0, express_1.Router)();
// Basic record operations
recordRoutes
    .route('/')
    .post(uploadMulter.any(), record_controller_1.RecordController.createRecord)
    .get(record_controller_1.RecordController.getRecordsByStatus);
// Add new version upload route
recordRoutes
    .route('/:id/versions')
    .post(uploadMulter.single('file'), record_controller_1.RecordController.uploadNewVersion);
recordRoutes.get('/other/:id/other-records', record_controller_1.RecordController.getOtherRecords);
// Status-related routes
recordRoutes.get('/my-records', record_controller_1.RecordController.getMyRecordsByStatus);
recordRoutes.get('/waiting-for-my-approval', record_controller_1.RecordController.getRecordsWaitingForMyApproval);
recordRoutes.put('/:id/approve', uploadMulter.any(), record_controller_1.RecordController.approveRecord);
recordRoutes.put('/:id/reject', uploadMulter.any(), record_controller_1.RecordController.rejectRecord);
recordRoutes.post('/:id/reassign', record_controller_1.RecordController.reassignRecord);
// File operations
fileRoutes.post('/with-files', record_controller_1.RecordController.createRecordWithFiles);
fileRoutes.post('/extract-pdf-fields', uploadMulter.array('pdfFiles'), record_controller_1.RecordController.extractPdfFields);
fileRoutes.get('/:id/pdf', record_controller_1.RecordController.getRecordWithPdf);
fileRoutes.get('/file/:filePath', record_controller_1.RecordController.getFileUrl);
versionRoutes
    .route('/:id/versions')
    .post(auth_middleware_1.authenticate, upload_middleware_1.upload.single('file'), record_controller_1.RecordController.uploadNewVersion)
    .get(record_controller_1.RecordController.getVersions);
versionRoutes.delete('/:id/versions/:versionId', auth_middleware_1.authenticate, record_controller_1.RecordController.deleteVersion);
recordRoutes.get('/:id', record_controller_1.RecordController.getRecord);
recordRoutes.put('/:id/update', uploadMulter.any(), record_controller_1.RecordController.updateRecord);
recordRoutes.put('/:id/modify', uploadMulter.any(), record_controller_1.RecordController.modifyRecord);
recordRoutes.delete('/:id', record_controller_1.RecordController.deleteRecord);
// Mount sub-routers
router.use('/', recordRoutes);
router.use('/files', fileRoutes);
router.use('/versions', versionRoutes);
exports.default = router;
