import { Router } from 'express';
import multer from 'multer';
import { UploadController } from '../controllers/upload.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Configure multer for memory storage (to get file buffer)
// Add file size limits and potentially file type filters
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Example: 5MB limit
    fileFilter: (req, file, cb) => {
        // Example: Accept only common image types
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images are allowed.') as any, false); // Cast error type
        }
    }
});

// Apply authentication middleware - ensure users are logged in to upload
router.use(authenticate(['user', 'admin', 'super_admin', 'super_user'])); // Adjust roles

// Define the upload route - expecting a single file named 'image'
// The 'folder' will be specified in the request body or query params
router.post('/image', upload.single('image'), UploadController.uploadImage);

export default router;
