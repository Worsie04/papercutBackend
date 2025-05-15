"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.imageService = exports.ImageService = void 0;
const user_image_model_1 = require("../models/user-image.model");
const errorHandler_1 = require("../presentation/middlewares/errorHandler");
const http_status_codes_1 = require("http-status-codes");
const client_s3_1 = require("@aws-sdk/client-s3");
const uuid_1 = require("uuid");
const path_1 = __importDefault(require("path"));
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUB_URL = process.env.R2_PUB_URL;
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_PUB_URL) {
    console.error("Cloudflare R2 environment variables are not fully set!");
}
const s3Client = new client_s3_1.S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});
class ImageService {
    async listUserImages(userId) {
        try {
            const images = await user_image_model_1.UserImage.findAll({
                where: { userId: userId },
                order: [['createdAt', 'DESC']],
                attributes: ['id', 'filename', 'publicUrl', 'createdAt'],
            });
            return images;
        }
        catch (error) {
            console.error('Error fetching user images:', error);
            throw new errorHandler_1.AppError(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR, 'Could not retrieve images.');
        }
    }
    async uploadImage(userId, file) {
        if (!file) {
            throw new errorHandler_1.AppError(http_status_codes_1.StatusCodes.BAD_REQUEST, 'No file uploaded.');
        }
        if (!R2_BUCKET_NAME || !R2_PUB_URL) {
            throw new errorHandler_1.AppError(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR, 'R2 bucket name or public URL is not configured.');
        }
        const fileExtension = path_1.default.extname(file.originalname);
        const uniqueFilename = `${(0, uuid_1.v4)()}${fileExtension}`;
        const storageKey = `user-${userId}/${uniqueFilename}`;
        const uploadParams = {
            Bucket: R2_BUCKET_NAME,
            Key: storageKey,
            Body: file.buffer,
            ContentType: file.mimetype,
            ACL: 'public-read',
        };
        let uploadedFileMeta;
        try {
            console.log(`Uploading ${file.originalname} to R2 bucket ${R2_BUCKET_NAME} as ${storageKey}`);
            await s3Client.send(new client_s3_1.PutObjectCommand(uploadParams));
            const r2PubUrlBase = R2_PUB_URL.endsWith('/') ? R2_PUB_URL.slice(0, -1) : R2_PUB_URL;
            const sKey = storageKey.startsWith('/') ? storageKey.slice(1) : storageKey;
            const publicUrlWithProtocol = `https://${r2PubUrlBase}/${sKey}`;
            uploadedFileMeta = {
                filename: file.originalname,
                storageKey: storageKey,
                publicUrl: publicUrlWithProtocol,
                size: file.size,
                mimeType: file.mimetype,
            };
            console.log('Upload to R2 successful, Full Public URL:', uploadedFileMeta.publicUrl);
        }
        catch (uploadError) {
            console.error('Error uploading to R2:', uploadError);
            throw new errorHandler_1.AppError(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to upload image to storage.');
        }
        try {
            const newImageRecord = await user_image_model_1.UserImage.create({
                userId,
                filename: uploadedFileMeta.filename,
                storageKey: uploadedFileMeta.storageKey,
                publicUrl: uploadedFileMeta.publicUrl,
                size: uploadedFileMeta.size,
                mimeType: uploadedFileMeta.mimeType,
            });
            return newImageRecord;
        }
        catch (dbError) {
            console.error('Error saving image metadata to DB:', dbError);
            try {
                await s3Client.send(new client_s3_1.DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: storageKey }));
                console.log(`Rolled back: Deleted ${storageKey} from R2 due to DB error.`);
            }
            catch (rollbackError) {
                console.error(`Failed to rollback R2 deletion for ${storageKey}:`, rollbackError);
            }
            throw new errorHandler_1.AppError(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to save image information after upload.');
        }
    }
    async deleteImage(userId, imageId) {
        try {
            const imageRecord = await user_image_model_1.UserImage.findOne({
                where: { id: imageId, userId: userId }
            });
            if (!imageRecord) {
                throw new errorHandler_1.AppError(http_status_codes_1.StatusCodes.NOT_FOUND, 'Image not found or access denied.');
            }
            if (!R2_BUCKET_NAME) {
                throw new errorHandler_1.AppError(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR, 'R2 bucket name is not configured.');
            }
            const deleteParams = {
                Bucket: R2_BUCKET_NAME,
                Key: imageRecord.storageKey,
            };
            try {
                console.log(`Deleting image ${imageRecord.storageKey} from R2 bucket ${R2_BUCKET_NAME}`);
                await s3Client.send(new client_s3_1.DeleteObjectCommand(deleteParams));
                console.log('Deletion from R2 successful.');
            }
            catch (storageError) {
                console.error(`Failed to delete image ${imageRecord.storageKey} from R2. Proceeding to delete DB record.`, storageError);
            }
            await imageRecord.destroy();
            console.log(`Image record ${imageId} soft-deleted from DB.`);
        }
        catch (error) {
            if (error instanceof errorHandler_1.AppError)
                throw error;
            console.error('Error deleting image:', error);
            throw new errorHandler_1.AppError(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR, 'Could not delete image.');
        }
    }
}
exports.ImageService = ImageService;
exports.imageService = new ImageService();
