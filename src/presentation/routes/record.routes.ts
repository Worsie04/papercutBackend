import { Router } from 'express';
import { RecordController } from '../controllers/record.controller';
import { authenticate } from '../middlewares/auth.middleware';
import multer from 'multer';
import { upload } from '../middlewares/upload.middleware';

const router = Router();

// Centralize multer configuration
const uploadMulter = multer({
  storage: multer.memoryStorage(),
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
router.use(authenticate('user')); // Apply authentication globally

// Create route groups
const recordRoutes = Router();
const fileRoutes = Router();
const versionRoutes = Router();

// Basic record operations
recordRoutes
  .route('/')
  .post(uploadMulter.any(), RecordController.createRecord)
  .get(RecordController.getRecordsByStatus);

recordRoutes
  .route('/:id')
  .get(RecordController.getRecord)
  .put(uploadMulter.any(), RecordController.updateRecord)
  .delete(RecordController.deleteRecord);

// Status-related routes
recordRoutes.get('/my-records', RecordController.getMyRecordsByStatus);
recordRoutes.get('/waiting-for-my-approval', RecordController.getRecordsWaitingForMyApproval);
recordRoutes.put('/:id/approve', uploadMulter.any(), RecordController.approveRecord);
recordRoutes.put('/:id/reject', uploadMulter.any(), RecordController.rejectRecord);

// File operations
fileRoutes.post('/with-files', RecordController.createRecordWithFiles);
fileRoutes.post('/extract-pdf-fields', uploadMulter.array('pdfFiles'), RecordController.extractPdfFields);
fileRoutes.get('/:id/pdf', RecordController.getRecordWithPdf);
fileRoutes.get('/file/:filePath', RecordController.getFileUrl);

versionRoutes
  .route('/:id/versions')
  .post(authenticate, upload.single('file'), RecordController.uploadNewVersion) // Fixed missing auth
  .get(authenticate, RecordController.getVersions); // Fixed missing auth

versionRoutes.delete('/:id/versions/:versionId', authenticate, RecordController.deleteVersion); // Fixed missing auth

// Mount sub-routers
router.use('/', recordRoutes);
router.use('/files', fileRoutes);
router.use('/versions', versionRoutes);

export default router;
