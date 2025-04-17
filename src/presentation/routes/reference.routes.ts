import { Router } from 'express';
import { ReferenceController } from '../controllers/reference.controller';

const router = Router();

router.post('/', ReferenceController.create);
router.get('/', ReferenceController.getAll);
router.put('/:id', ReferenceController.update);
router.delete('/:id', ReferenceController.delete);

export default router;
