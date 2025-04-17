import { Request, Response } from 'express';
import chatService from '../../services/chat.service';
import { AuthenticatedRequest } from '../../types/express';

class ChatController {
  /**
   * Get all messages for a record
   */
  async getRecordMessages(req: Request, res: Response): Promise<void> {
    try {
      const { recordId } = req.params;
      
      const messages = await chatService.getRecordMessages(recordId);
      
      res.status(200).json(messages);
    } catch (error) {
      console.error('Error getting record messages:', error);
      res.status(500).json({ 
        error: 'Failed to get messages',
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Create a new message
   */
  async createMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { recordId } = req.params;
      const { message, mentions } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      if (!message || typeof message !== 'string') {
        res.status(400).json({ error: 'Message is required' });
        return;
      }
      
      const newMessage = await chatService.createMessage(
        recordId,
        userId,
        message,
        mentions || []
      );
      
      res.status(201).json(newMessage);
    } catch (error) {
      console.error('Error creating message:', error);
      res.status(500).json({ 
        error: 'Failed to create message',
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { messageId } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      await chatService.deleteMessage(messageId, userId);
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting message:', error);
      
      if (error instanceof Error && error.message === 'Message not found') {
        res.status(404).json({ error: 'Message not found' });
        return;
      }
      
      if (error instanceof Error && error.message === 'Not authorized to delete this message') {
        res.status(403).json({ error: 'Not authorized to delete this message' });
        return;
      }
      
      res.status(500).json({ 
        error: 'Failed to delete message',
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
}

export default new ChatController();