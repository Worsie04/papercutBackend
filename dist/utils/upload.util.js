"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFile = uploadFile;
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
async function uploadFile(file, folder) {
    const uploadDir = path_1.default.join(process.cwd(), '..', 'client', 'public', 'uploads', folder);
    await promises_1.default.mkdir(uploadDir, { recursive: true });
    const filename = `${Date.now()}-${file.originalname}`;
    const filepath = path_1.default.join(uploadDir, filename);
    await promises_1.default.writeFile(filepath, file.buffer);
    return path_1.default.join('/uploads', folder, filename).replace(/\\/g, '/');
}
