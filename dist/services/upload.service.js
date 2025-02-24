"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadService = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const uuid_1 = require("uuid");
const errorHandler_1 = require("../presentation/middlewares/errorHandler");
const pdf_parse_1 = __importDefault(require("pdf-parse"));
class UploadService {
    static async getPageCount(buffer, mimeType) {
        try {
            if (mimeType === 'application/pdf') {
                const data = await (0, pdf_parse_1.default)(buffer);
                return data.numpages;
            }
            return null;
        }
        catch (error) {
            console.error('Error getting page count:', error);
            return null;
        }
    }
    static async uploadFile(file) {
        try {
            const fileExtension = file.originalname.split('.').pop();
            const uniqueFileName = `${(0, uuid_1.v4)()}.${fileExtension}`;
            // Get page count before upload
            const pageCount = await this.getPageCount(file.buffer, file.mimetype);
            const uploadParams = {
                Bucket: process.env.R2_BUCKET_NAME || '',
                Key: uniqueFileName,
                Body: file.buffer,
                ContentType: file.mimetype,
            };
            await this.s3Client.send(new client_s3_1.PutObjectCommand(uploadParams));
            return {
                fileName: file.originalname,
                fileSize: file.size,
                fileType: file.mimetype,
                filePath: uniqueFileName,
                fileHash: uniqueFileName, // Using the unique filename as hash for simplicity
                pageCount,
            };
        }
        catch (error) {
            console.error('Error uploading file:', error);
            throw new errorHandler_1.AppError(500, 'Failed to upload file');
        }
    }
    static async getFileDownloadUrl(filePath) {
        try {
            const command = new client_s3_1.GetObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME || '',
                Key: filePath,
            });
            // URL expires in 1 hour
            const signedUrl = await (0, s3_request_presigner_1.getSignedUrl)(this.s3Client, command, { expiresIn: 3600 });
            return signedUrl;
        }
        catch (error) {
            console.error('Error generating download URL:', error);
            throw new errorHandler_1.AppError(500, 'Failed to generate download URL');
        }
    }
    static async getFileViewUrl(filePath) {
        try {
            const command = new client_s3_1.GetObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME || '',
                Key: filePath,
            });
            // URL expires in 5 minutes for viewing
            const signedUrl = await (0, s3_request_presigner_1.getSignedUrl)(this.s3Client, command, { expiresIn: 300 });
            return signedUrl;
        }
        catch (error) {
            console.error('Error generating view URL:', error);
            throw new errorHandler_1.AppError(500, 'Failed to generate view URL');
        }
    }
}
exports.UploadService = UploadService;
UploadService.s3Client = new client_s3_1.S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
});
