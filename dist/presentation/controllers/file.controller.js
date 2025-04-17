"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureMulter = exports.FileController = void 0;
const multer_1 = __importDefault(require("multer"));
const file_service_1 = __importDefault(require("../../services/file.service"));
const jwt_util_1 = require("../../utils/jwt.util");
// Configure multer for memory storage
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (_req, file, cb) => {
        // Accept PDF files only
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        }
        else {
            cb(null, false);
        }
    }
});
class FileController {
    /**
     * Upload multiple files
     */
    async uploadFiles(req, res) {
        try {
            // Extract token from authorization header
            const authHeader = req.headers.authorization;
            let userId;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.substring(7); // Remove 'Bearer ' prefix
                try {
                    // Verify the token and extract user ID
                    const decoded = jwt_util_1.JwtUtil.verifyToken(token);
                    userId = decoded.id;
                }
                catch (tokenError) {
                    console.error('Token verification failed:', tokenError);
                    // Allow uploads even without valid authentication for now
                    // We'll create temporary user uploads
                    userId = 'anonymous';
                }
            }
            else {
                // No authentication token provided
                // Use anonymous user ID for temporary uploads
                userId = 'anonymous';
            }
            if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
                res.status(400).json({ error: 'No files uploaded' });
                return;
            }
            const savedFiles = await file_service_1.default.saveMultipleFiles(req.files, userId);
            res.status(201).json({
                message: 'Files uploaded successfully',
                files: savedFiles
            });
        }
        catch (error) {
            console.error('Error uploading files:', error);
            res.status(500).json({ error: 'Failed to upload files' });
        }
    }
    /**
     * Get all unallocated files for the current user
     */
    async getUnallocatedFiles(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const userId = req.user.id;
            const files = await file_service_1.default.getUnallocatedFiles(userId);
            res.status(200).json(files);
        }
        catch (error) {
            console.error('Error getting unallocated files:', error);
            res.status(500).json({ error: 'Failed to get unallocated files' });
        }
    }
    /**
     * Save files as unallocated
     */
    async saveToUnallocated(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const userId = req.user.id;
            const { fileIds } = req.body;
            if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
                res.status(400).json({ error: 'No file IDs provided' });
                return;
            }
            await file_service_1.default.markAsUnallocated(fileIds, userId);
            res.status(200).json({
                message: 'Files saved to unallocated successfully',
                count: fileIds.length
            });
        }
        catch (error) {
            console.error('Error saving files as unallocated:', error);
            res.status(500).json({ error: 'Failed to save files as unallocated' });
        }
    }
    /**
     * Extract fields from a file
     */
    async extractFields(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const userId = req.user.id;
            const fileId = req.params.fileId;
            if (!fileId) {
                res.status(400).json({ error: 'No file ID provided' });
                return;
            }
            const extractionResult = await file_service_1.default.extractFields(fileId, userId);
            res.status(200).json(extractionResult);
        }
        catch (error) {
            console.error('Error extracting fields:', error);
            res.status(500).json({ error: 'Failed to extract fields' });
        }
    }
    /**
     * Get file by ID
     */
    async getFileById(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const userId = req.user.id;
            const fileId = req.params.id;
            if (!fileId) {
                res.status(400).json({ error: 'No file ID provided' });
                return;
            }
            const file = await file_service_1.default.getFileById(fileId, userId);
            if (!file) {
                res.status(404).json({ error: 'File not found' });
                return;
            }
            res.status(200).json(file);
        }
        catch (error) {
            console.error('Error getting file:', error);
            res.status(500).json({ error: 'Failed to get file' });
        }
    }
    /**
     * Delete file by ID
     */
    async deleteFile(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const userId = req.user.id;
            const fileId = req.params.id;
            if (!fileId) {
                res.status(400).json({ error: 'No file ID provided' });
                return;
            }
            await file_service_1.default.deleteFile(fileId, userId);
            res.status(200).json({ message: 'File deleted successfully' });
        }
        catch (error) {
            console.error('Error deleting file:', error);
            res.status(500).json({ error: 'Failed to delete file' });
        }
    }
}
exports.FileController = FileController;
const configureMulter = () => {
    return {
        single: () => upload.single('file'),
        multiple: () => upload.array('files', 100) // Allow up to 100 files
    };
};
exports.configureMulter = configureMulter;
exports.default = new FileController();
