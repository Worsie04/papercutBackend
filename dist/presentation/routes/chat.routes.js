"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chat_controller_1 = __importDefault(require("../controllers/chat.controller"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.use((0, auth_middleware_1.authenticate)('user'));
// Get all messages for a record
router.get('/records/:recordId/chat', chat_controller_1.default.getRecordMessages);
// Create a new message
router.post('/records/:recordId/chat', chat_controller_1.default.createMessage);
// Delete a message
router.delete('/chat/:messageId', chat_controller_1.default.deleteMessage);
exports.default = router;
