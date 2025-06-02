import { Router } from 'express';
import multer from 'multer';
import { SignatureController } from '../controllers/signature.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { AppError } from '../middlewares/errorHandler';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

// Apply authentication middleware to all routes
router.use(authenticate('user'));

// GET /api/v1/signatures - Get user's signatures
router.get('/', SignatureController.getUserSignatures);

// POST /api/v1/signatures - Upload a new signature
router.post('/', upload.single('signatureFile'), SignatureController.uploadSignature);

// GET /api/v1/signatures/:signatureId - Get a specific signature
router.get('/:signatureId', SignatureController.getSignatureById);

// DELETE /api/v1/signatures/:signatureId - Delete a signature
router.delete('/:signatureId', SignatureController.deleteSignature);

export default router; 