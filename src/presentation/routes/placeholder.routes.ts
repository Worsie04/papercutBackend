// placeholder.routes.ts
import { Router } from 'express';
import { PlaceholderController } from '../controllers/placeholder.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate('user'));

router.get('/check/:placeholderName', PlaceholderController.checkAndFindPlaceholder);
router.get('/', PlaceholderController.getPlaceholders);
router.post('/', PlaceholderController.createPlaceholder);
router.delete('/:id', PlaceholderController.deletePlaceholder);
router.put('/:id', PlaceholderController.updatePlaceholder);

export default router;