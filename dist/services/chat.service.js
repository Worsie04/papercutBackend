"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chat_message_model_1 = __importDefault(require("../models/chat-message.model"));
const user_model_1 = require("../models/user.model");
class ChatService {
    /**
     * Create a new chat message
     */
    async createMessage(recordId, userId, message, mentions = []) {
        try {
            const newMessage = await chat_message_model_1.default.create({
                recordId,
                userId,
                message,
                mentions
            });
            // Fetch the user for the response
            const messageWithUser = await this.getMessageById(newMessage.id);
            return messageWithUser;
        }
        catch (error) {
            console.error('Error creating chat message:', error);
            throw error;
        }
    }
    /**
     * Get a message by ID
     */
    async getMessageById(messageId) {
        try {
            const message = await chat_message_model_1.default.findByPk(messageId, {
                include: [
                    {
                        model: user_model_1.User,
                        as: 'user',
                        attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
                    }
                ]
            });
            if (!message) {
                throw new Error('Message not found');
            }
            return this.formatChatMessage(message);
        }
        catch (error) {
            console.error('Error getting chat message:', error);
            throw error;
        }
    }
    /**
     * Get messages for a record
     */
    async getRecordMessages(recordId) {
        try {
            const messages = await chat_message_model_1.default.findAll({
                where: {
                    recordId
                },
                include: [
                    {
                        model: user_model_1.User,
                        as: 'user',
                        attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
                    }
                ],
                order: [['createdAt', 'ASC']]
            });
            return messages.map(message => this.formatChatMessage(message));
        }
        catch (error) {
            console.error('Error getting record messages:', error);
            throw error;
        }
    }
    /**
     * Delete a message
     */
    async deleteMessage(messageId, userId) {
        try {
            const message = await chat_message_model_1.default.findByPk(messageId);
            if (!message) {
                throw new Error('Message not found');
            }
            // Only the message author can delete their own message
            if (message.userId !== userId) {
                throw new Error('Not authorized to delete this message');
            }
            await message.destroy();
            return { success: true };
        }
        catch (error) {
            console.error('Error deleting chat message:', error);
            throw error;
        }
    }
    /**
     * Format chat message for API response
     */
    formatChatMessage(message) {
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
exports.default = new ChatService();
