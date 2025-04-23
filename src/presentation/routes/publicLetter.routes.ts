// src/presentation/routes/publicLetter.routes.ts
import { Router } from 'express';
import { PublicLetterController } from '../controllers/publicLetter.controller'; // NEW Controller

const router = Router();

// No authentication middleware needed here
router.get('/:id', PublicLetterController.getPublicLetter); // Route to get public details
router.get('/view-pdf/:key(*)', PublicLetterController.getPublicPdfViewUrl); // Route to get view URL by key

export default router;