import { Op } from 'sequelize';
import ChatMessage from '../models/chat-message.model';
import { User } from '../models/user.model';

class ChatService {
  /**
   * Create a new chat message
   */
  async createMessage(recordId: string, userId: string, message: string, mentions: string[] = []) {
    try {
      const newMessage = await ChatMessage.create({
        recordId,
        userId,
        message,
        mentions
      });

      // Fetch the user for the response
      const messageWithUser = await this.getMessageById(newMessage.id);
      return messageWithUser;
    } catch (error) {
      console.error('Error creating chat message:', error);
      throw error;
    }
  }

  /**
   * Get a message by ID
   */
  async getMessageById(messageId: string) {
    try {
      const message = await ChatMessage.findByPk(messageId, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
          }
        ]
      });

      if (!message) {
        throw new Error('Message not found');
      }

      return this.formatChatMessage(message);
    } catch (error) {
      console.error('Error getting chat message:', error);
      throw error;
    }
  }

  /**
   * Get messages for a record
   */
  async getRecordMessages(recordId: string) {
    try {
      const messages = await ChatMessage.findAll({
        where: {
          recordId
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
          }
        ],
        order: [['createdAt', 'ASC']]
      });

      return messages.map(message => this.formatChatMessage(message));
    } catch (error) {
      console.error('Error getting record messages:', error);
      throw error;
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string, userId: string) {
    try {
      const message = await ChatMessage.findByPk(messageId);

      if (!message) {
        throw new Error('Message not found');
      }

      // Only the message author can delete their own message
      if (message.userId !== userId) {
        throw new Error('Not authorized to delete this message');
      }

      await message.destroy();
      return { success: true };
    } catch (error) {
      console.error('Error deleting chat message:', error);
      throw error;
    }
  }

  /**
   * Format chat message for API response
   */
  private formatChatMessage(message: any) {
    const userInfo = message.user ? {
      id: message.user.id,
      firstName: message.user.firstName,
      lastName: message.user.lastName,
      email: message.user.email,
      avatar: message.user.avatar
    } : null;

    return {
      id: message.id,
      recordId: message.recordId,
      userId: message.userId,
      message: message.message,
      mentions: message.mentions,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      user: userInfo
    };
  }
}

export default new ChatService();