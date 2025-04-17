"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const file_controller_1 = __importStar(require("../controllers/file.controller"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
const multerConfig = (0, file_controller_1.configureMulter)();
// File upload endpoint - authentication will be handled in the controller
router.post('/upload', multerConfig.multiple(), file_controller_1.default.uploadFiles.bind(file_controller_1.default));
// Protected routes - apply auth middleware to all routes below
router.use((0, auth_middleware_1.authenticate)('user'));
// Get unallocated files
router.get('/unallocated', file_controller_1.default.getUnallocatedFiles.bind(file_controller_1.default));
// Save files to unallocated
router.post('/unallocated/save', file_controller_1.default.saveToUnallocated.bind(file_controller_1.default));
// Extract fields from a file
router.post('/extract-fields/:fileId', file_controller_1.default.extractFields.bind(file_controller_1.default));
// Get file by ID
router.get('/:id', file_controller_1.default.getFileById.bind(file_controller_1.default));
// Delete file
router.delete('/:id', file_controller_1.default.deleteFile.bind(file_controller_1.default));
exports.default = router;
