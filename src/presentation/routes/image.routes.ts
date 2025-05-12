import { Router } from 'express';
import { ImageController } from '../controllers/image.controller';
import { authenticate } from '../middlewares/auth.middleware';
import multer from 'multer';

const router = Router();

const storage = multer.memoryStorage(); 
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Not an image! Please upload an image file.') as any, false);
        }
    }
});

router.use(authenticate('user'));
router.get('/', ImageController.getUserImages);
router.post(
    '/uploads', 
    upload.single('upload'),
    ImageController.uploadNewImage
);

router.delete('/:imageId', ImageController.deleteUserImage);


export default router;