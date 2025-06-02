import { Router } from 'express';
import multer from 'multer';
import { StampController } from '../controllers/stamp.controller';
import { authenticate } from '../middlewares/auth.middleware';

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

// GET /api/v1/stamps - Get user's stamps
router.get('/', StampController.getUserStamps);

// POST /api/v1/stamps - Upload a new stamp
router.post('/', upload.single('stampFile'), StampController.uploadStamp);

// DELETE /api/v1/stamps/:stampId - Delete a stamp
router.delete('/:stampId', StampController.deleteStamp);

// GET /api/v1/stamps/:stampId - Get stamp by ID
router.get('/:stampId', StampController.getStampById);

export default router; 