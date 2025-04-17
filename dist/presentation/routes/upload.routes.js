"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const upload_controller_1 = require("../controllers/upload.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Configure multer for memory storage (to get file buffer)
// Add file size limits and potentially file type filters
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Example: 5MB limit
    fileFilter: (req, file, cb) => {
        // Example: Accept only common image types
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only images are allowed.'), false); // Cast error type
        }
    }
});
// Apply authentication middleware - ensure users are logged in to upload
router.use((0, auth_middleware_1.authenticate)(['user', 'admin', 'super_admin', 'super_user'])); // Adjust roles
// Define the upload route - expecting a single file named 'image'
// The 'folder' will be specified in the request body or query params
router.post('/image', upload.single('image'), upload_controller_1.UploadController.uploadImage);
exports.default = router;
