import { Router } from 'express';
import chatController from '../controllers/chat.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticate('user'));

// Get all messages for a record
router.get('/records/:recordId/chat', chatController.getRecordMessages);

// Create a new message
router.post('/records/:recordId/chat', chatController.createMessage);

// Delete a message
router.delete('/chat/:messageId', chatController.deleteMessage);

export default router;