"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const letter_controller_1 = require("../controllers/letter.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const letterComment_controller_1 = require("../controllers/letterComment.controller");
const router = (0, express_1.Router)();
router.use((0, auth_middleware_1.authenticate)(['user', 'admin', 'super_admin', 'super_user']));
router.get('/pending-review', letter_controller_1.LetterController.getPendingReviewLetters);
router.post('/', letter_controller_1.LetterController.create);
router.get('/', letter_controller_1.LetterController.getAllByUserId);
router.get('/:id/view-url', letter_controller_1.LetterController.getSignedPdfViewUrl);
router.get('/:id', letter_controller_1.LetterController.getById);
router.delete('/:id', letter_controller_1.LetterController.delete);
//router.put('/:id', LetterController.update);
router.post('/from-pdf-interactive', letter_controller_1.LetterController.createFromPdfInteractive);
router.post('/:id/approve-review', letter_controller_1.LetterController.approveLetterReview);
router.post('/:id/reject-review', letter_controller_1.LetterController.rejectLetterReview);
// --- NEW Comment Routes ---
router.post('/:id/comments', letterComment_controller_1.LetterCommentController.addComment); // Add a comment
router.get('/:id/comments', letterComment_controller_1.LetterCommentController.getLetterComments); // Get comments for a letter
// -
exports.default = router;
