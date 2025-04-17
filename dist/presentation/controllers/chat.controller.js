"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chat_service_1 = __importDefault(require("../../services/chat.service"));
class ChatController {
    /**
     * Get all messages for a record
     */
    async getRecordMessages(req, res) {
        try {
            const { recordId } = req.params;
            const messages = await chat_service_1.default.getRecordMessages(recordId);
            res.status(200).json(messages);
        }
        catch (error) {
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
    async createMessage(req, res) {
        var _a;
        try {
            const { recordId } = req.params;
            const { message, mentions } = req.body;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            if (!message || typeof message !== 'string') {
                res.status(400).json({ error: 'Message is required' });
                return;
            }
            const newMessage = await chat_service_1.default.createMessage(recordId, userId, message, mentions || []);
            res.status(201).json(newMessage);
        }
        catch (error) {
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
    async deleteMessage(req, res) {
        var _a;
        try {
            const { messageId } = req.params;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            await chat_service_1.default.deleteMessage(messageId, userId);
            res.status(200).json({ success: true });
        }
        catch (error) {
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
exports.default = new ChatController();
