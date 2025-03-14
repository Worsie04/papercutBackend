import { Router } from 'express';
import fileController, { configureMulter } from '../controllers/file.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const multerConfig = configureMulter();

// File upload endpoint - authentication will be handled in the controller
router.post('/upload', multerConfig.multiple(), fileController.uploadFiles.bind(fileController));

// Protected routes - apply auth middleware to all routes below
router.use(authenticate('user'));

// Get unallocated files
router.get('/unallocated', fileController.getUnallocatedFiles.bind(fileController));

// Save files to unallocated
router.post('/unallocated/save', fileController.saveToUnallocated.bind(fileController));

// Extract fields from a file
router.post('/extract-fields/:fileId', fileController.extractFields.bind(fileController));

// Get file by ID
router.get('/:id', fileController.getFileById.bind(fileController));

// Delete file
router.delete('/:id', fileController.deleteFile.bind(fileController));

export default router;