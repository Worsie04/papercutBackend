import { Router } from 'express';
import { RecordController } from '../controllers/record.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticate('user'));

// Record routes
router.post('/', RecordController.createRecord);
router.get('/:id', RecordController.getRecord);
router.put('/:id', RecordController.updateRecord);
router.delete('/:id', RecordController.deleteRecord);
router.get('/', RecordController.getRecordsByStatus);

export default router; 