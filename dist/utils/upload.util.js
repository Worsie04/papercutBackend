"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFile = uploadFile;
const r2_util_1 = require("./r2.util");
async function uploadFile(file, folder) {
    const filename = `${Date.now()}-${file.originalname}`;
    // Upload to R2
    await (0, r2_util_1.uploadFileToR2)(file.buffer, filename, folder, file.mimetype || 'application/octet-stream');
    // Return only the relative path
    return `${folder}/${filename}`;
}
