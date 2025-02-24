"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFileToR2 = uploadFileToR2;
exports.deleteFileFromR2 = deleteFileFromR2;
const client_s3_1 = require("@aws-sdk/client-s3");
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    throw new Error('Missing required R2 environment variables');
}
const r2Client = new client_s3_1.S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});
async function uploadFileToR2(file, fileName, folder, contentType = 'application/octet-stream') {
    const key = `${folder}/${fileName}`;
    try {
        await r2Client.send(new client_s3_1.PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            Body: file,
            ContentType: contentType,
        }));
    }
    catch (error) {
        console.error('Error uploading to R2:', error);
        throw new Error('Failed to upload file to R2');
    }
}
async function deleteFileFromR2(key) {
    try {
        await r2Client.send(new client_s3_1.DeleteObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
        }));
    }
    catch (error) {
        console.error('Error deleting from R2:', error);
        throw new Error('Failed to delete file from R2');
    }
}
