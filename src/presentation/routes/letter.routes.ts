import { Router } from 'express';
import { LetterController } from '../controllers/letter.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate(['user', 'admin', 'super_admin', 'super_user']));
router.get('/pending-review', LetterController.getPendingReviewLetters);
router.get('/pending-my-action', LetterController.getLettersPendingMyAction);
router.get('/my-rejected', LetterController.getMyRejectedLetters);


router.post('/', LetterController.create);
router.get('/', LetterController.getAllByUserId);
router.get('/:id/view-url', LetterController.getSignedPdfViewUrl);
router.get('/:id', LetterController.getById);
router.delete('/:id', LetterController.delete);
//router.put('/:id', LetterController.update);

router.post('/from-pdf-interactive', LetterController.createFromPdfInteractive);
router.post('/:id/approve-review', LetterController.approveLetterReview);
router.post('/:id/reject-review', LetterController.rejectLetterReview);
router.post('/:id/resubmit', LetterController.resubmitRejectedLetter);
router.post('/:id/final-approve', LetterController.finalApproveLetter);


export default router;
