import { Router } from 'express';
import { CabinetController } from '../controllers/cabinet.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate('user'));

// Cabinet routes
router.post('/', CabinetController.createCabinet);
router.get('/approved', CabinetController.getApprovedCabinets);
router.get('/', CabinetController.getCabinets);
router.get('/:id', CabinetController.getCabinet);

export default router; 