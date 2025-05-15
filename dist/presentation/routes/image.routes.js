"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const image_controller_1 = require("../controllers/image.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Not an image! Please upload an image file.'), false);
        }
    }
});
router.use((0, auth_middleware_1.authenticate)('user'));
router.get('/', image_controller_1.ImageController.getUserImages);
router.post('/uploads', upload.single('upload'), image_controller_1.ImageController.uploadNewImage);
router.delete('/:imageId', image_controller_1.ImageController.deleteUserImage);
exports.default = router;
