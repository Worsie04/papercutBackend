import { Router } from 'express';
import { RecordController } from '../controllers/record.controller';
import { authenticate } from '../middlewares/auth.middleware';
import multer from 'multer';
import { upload } from '../middlewares/upload.middleware';

const router = Router();

// Configure multer for memory storage
const uploadMulter = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// Apply auth middleware to all routes
router.use(authenticate('user'));

// Record routes
router.post('/', uploadMulter.any(), RecordController.createRecord);
router.get('/', RecordController.getRecordsByStatus);
// New endpoint for getting records created by the current user with a specific status
router.get('/my-records', RecordController.getMyRecordsByStatus);
// New endpoint for getting records waiting for the current user's approval
router.get('/waiting-for-my-approval', RecordController.getRecordsWaitingForMyApproval);
router.get('/:id', RecordController.getRecord);
router.get('/file/:filePath', RecordController.getFileUrl);
router.put('/:id/update', uploadMulter.any(), RecordController.updateRecord);
router.put('/:id/approve', uploadMulter.any(), RecordController.approveRecord);
router.put('/:id/reject', uploadMulter.any(), RecordController.rejectRecord);
router.delete('/:id', RecordController.deleteRecord);

// File version routes
router.post(
  '/:id/versions',
  authenticate,
  upload.single('file'),
  RecordController.uploadNewVersion
);

router.get(
  '/:id/versions',
  authenticate,
  RecordController.getVersions
);

router.delete(
  '/:id/versions/:versionId',
  authenticate,
  RecordController.deleteVersion
);

export default router;