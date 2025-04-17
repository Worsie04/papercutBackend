// routes/search.routes.ts
import { Router } from 'express';
import { SearchController } from '../controllers/search.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate());
router.post('/', SearchController.searchRecords);

export default router;