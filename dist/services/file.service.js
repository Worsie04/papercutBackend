"use strict";
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileService = void 0;
const uuid_1 = require("uuid");
const file_model_1 = __importDefault(require("../models/file.model"));
const record_file_model_1 = __importDefault(require("../models/record-file.model"));
const r2_util_1 = require("../utils/r2.util");
const upload_service_1 = require("./upload.service");
const path_1 = __importDefault(require("path"));
const client_s3_1 = require("@aws-sdk/client-s3");
const errorHandler_1 = require("../presentation/middlewares/errorHandler");
const s3Client = new client_s3_1.S3Client({
    region: 'auto', // R2 üçün adətən 'auto'
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
});
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || '';
// --------------------------------
class FileService {
    /**
     * Save uploaded file to Cloudflare R2 and database
     */
    async saveFile(file, userId) {
        try {
            const originalName = file.originalname;
            const fileExtension = path_1.default.extname(originalName);
            const baseName = path_1.default.basename(originalName, fileExtension);
            const shortId = (0, uuid_1.v4)().slice(0, 3);
            const uniqueFilename = `${baseName}-${shortId}${fileExtension}`;
            //const fileExtension = file.originalname.split('.').pop();
            //const uniqueFilename = `${file.originalname}.${uuidv4()}.${fileExtension}`;
            const folder = 'uploads'; // You can organize files in folders
            // Upload to Cloudflare R2
            await (0, r2_util_1.uploadFileToR2)(file.buffer, uniqueFilename, folder, file.mimetype);
            // Create file record in the database
            const fileRecord = await file_model_1.default.create({
                name: uniqueFilename,
                originalName: file.originalname,
                path: `${folder}/${uniqueFilename}`,
                type: file.mimetype,
                size: file.size,
                isAllocated: false,
                userId
            });
            return fileRecord;
        }
        catch (error) {
            console.error('Error saving file:', error);
            throw error;
        }
    }
    /**
     * Save multiple files to Cloudflare R2 and database
     */
    async saveMultipleFiles(files, userId) {
        try {
            const savedFiles = await Promise.all(files.map(file => this.saveFile(file, userId)));
            return savedFiles;
        }
        catch (error) {
            console.error('Error saving multiple files:', error);
            throw error;
        }
    }
    async getUnallocatedFiles(userId) {
        try {
            const filesFromDb = await file_model_1.default.findAll({
                where: {
                    userId,
                    isAllocated: false
                },
                // `path`-ı da seçdiyinizə əmin olun
                attributes: ['id', 'name', 'path', 'size', 'userId', 'isAllocated', 'createdAt', 'updatedAt'],
                order: [['createdAt', 'DESC']],
                raw: true // Nəticələri sadə obyektlər kimi almaq üçün (Sequelize istifadə edirsinizsə)
            });
            if (!filesFromDb || filesFromDb.length === 0) {
                return [];
            }
            // Hər bir fayl üçün imzalanmış URL almaq üçün Promises massivi yaradırıq
            const filesWithUrlsPromises = filesFromDb.map(async (file) => {
                if (file.path) { // path varsa URL yaratmağa çalışırıq
                    try {
                        // getFileViewUrl funksiyasını çağırırıq (statik və ya instance üzərindən)
                        const signedUrl = await upload_service_1.UploadService.getFileViewUrl(file.path);
                        // Orijinal fayl obyektinə 'url' xüsusiyyətini əlavə edirik
                        return Object.assign(Object.assign({}, file), { url: signedUrl // Əlavə edilmiş imzalanmış URL
                         });
                    }
                    catch (urlError) {
                        console.error(`Error generating URL for path ${file.path}:`, urlError);
                        // URL yaradıla bilmədisə, url-i null olaraq təyin edirik və ya səhvi başqa cür idarə edirik
                        return Object.assign(Object.assign({}, file), { url: null });
                    }
                }
                else {
                    // Path yoxdursa, url null olacaq
                    return Object.assign(Object.assign({}, file), { url: null });
                }
            });
            // Bütün URL generasiya proseslərinin bitməsini gözləyirik
            const filesWithUrls = await Promise.all(filesWithUrlsPromises);
            return filesWithUrls; // URL-ləri əlavə edilmiş fayl siyahısını qaytarırıq
        }
        catch (error) {
            console.error('Error getting unallocated files with URLs:', error);
            throw error; // Və ya daha spesifik səhv idarəetməsi
        }
    }
    async markAsUnallocated(fileIds, userId) {
        try {
            await file_model_1.default.update({ isAllocated: false }, {
                where: {
                    id: fileIds,
                    userId
                }
            });
            return true;
        }
        catch (error) {
            console.error('Error marking files as unallocated:', error);
            throw error;
        }
    }
    async associateFilesWithRecord(fileIds, recordId) {
        try {
            // Create entries in the join table
            const recordFiles = fileIds.map(fileId => ({
                id: (0, uuid_1.v4)(),
                recordId,
                fileId
            }));
            await record_file_model_1.default.bulkCreate(recordFiles);
            // Mark files as allocated
            await file_model_1.default.update({ isAllocated: true }, {
                where: {
                    id: fileIds
                }
            });
            return { success: true, count: fileIds.length };
        }
        catch (error) {
            console.error('Error associating files with record:', error);
            throw error;
        }
    }
    async extractFields(fileId, userId) {
        try {
            // Get the file
            const file = await file_model_1.default.findOne({
                where: { id: fileId, userId }
            });
            if (!file) {
                throw new Error('File not found');
            }
            // In a real implementation, you would use a PDF extraction library here
            // For demonstration purposes, we'll return some mock extracted fields
            // This would be replaced with actual extraction logic based on your requirements
            // Mock extracted fields
            const extractedFields = [
                { name: 'Invoice Number', value: 'INV-12345' },
                { name: 'Date', value: new Date().toISOString().split('T')[0] },
                { name: 'Customer Name', value: 'ACME Corporation' },
                { name: 'Amount', value: '$1,234.56' },
                { name: 'Due Date', value: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] }
            ];
            return { extractedFields, fileId };
        }
        catch (error) {
            console.error('Error extracting fields:', error);
            throw error;
        }
    }
    async getFileById(fileId, userId) {
        try {
            return await file_model_1.default.findOne({
                where: { id: fileId, userId }
            });
        }
        catch (error) {
            console.error('Error getting file by ID:', error);
            throw error;
        }
    }
    async deleteFile(fileId, userId) {
        try {
            const file = await file_model_1.default.findOne({
                where: { id: fileId, userId }
            });
            if (!file) {
                throw new Error('File not found');
            }
            // Delete from database
            await file.destroy();
            return true;
        }
        catch (error) {
            console.error('Error deleting file:', error);
            throw error;
        }
    }
    // --- NEW STATIC METHOD: Get file content as Buffer from R2 ---
    static async getFileBuffer(r2Key) {
        var _a, e_1, _b, _c;
        console.log(`FileService: Attempting to download file buffer for key: ${r2Key}`);
        if (!R2_BUCKET_NAME) {
            throw new errorHandler_1.AppError(500, 'R2_BUCKET_NAME is not configured.');
        }
        const command = new client_s3_1.GetObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: r2Key,
        });
        try {
            const { Body } = await s3Client.send(command);
            if (!Body) {
                throw new errorHandler_1.AppError(404, `File not found or empty body in R2 for key: ${r2Key}`);
            }
            // Body is a ReadableStream | Readable | Blob | Uint8Array
            // Convert stream to buffer
            const chunks = [];
            // Assuming Body is a ReadableStream (Node.js environment)
            // Adjust if using different environment (e.g., browser ReadableStream)
            if (typeof Body.on === 'function') { // Check if it behaves like a Node stream
                const stream = Body;
                try {
                    for (var _d = true, stream_1 = __asyncValues(stream), stream_1_1; stream_1_1 = await stream_1.next(), _a = stream_1_1.done, !_a; _d = true) {
                        _c = stream_1_1.value;
                        _d = false;
                        const chunk = _c;
                        chunks.push(Buffer.from(chunk));
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (!_d && !_a && (_b = stream_1.return)) await _b.call(stream_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
                const buffer = Buffer.concat(chunks);
                console.log(`FileService: Successfully downloaded buffer (${buffer.length} bytes) for key: ${r2Key}`);
                return buffer;
            }
            else if (Body instanceof Uint8Array) {
                const buffer = Buffer.from(Body);
                console.log(`FileService: Successfully obtained buffer directly (${buffer.length} bytes) for key: ${r2Key}`);
                return buffer;
            }
            else {
                // Handle other Body types if necessary (e.g., Blob in browser)
                throw new errorHandler_1.AppError(500, `Unsupported R2 response body type for key: ${r2Key}`);
            }
        }
        catch (error) {
            console.error(`FileService: Error downloading file from R2 (key: ${r2Key}):`, error);
            // Check for specific S3 errors like NoSuchKey
            if (error.name === 'NoSuchKey') {
                throw new errorHandler_1.AppError(404, `File not found in R2 for key: ${r2Key}`);
            }
            throw new errorHandler_1.AppError(500, `Could not download file from R2: ${error.message}`);
        }
    }
    // --- NEW STATIC METHOD: Upload a Buffer to R2 ---
    static async uploadBuffer(buffer, r2Key, mimetype) {
        console.log(`FileService: Attempting to upload buffer (${buffer.length} bytes) to key: ${r2Key} with type: ${mimetype}`);
        if (!R2_BUCKET_NAME) {
            throw new errorHandler_1.AppError(500, 'R2_BUCKET_NAME is not configured.');
        }
        const command = new client_s3_1.PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: r2Key,
            Body: buffer,
            ContentType: mimetype,
            // ACL: 'public-read', // IMPORTANT: Set ACL if needed for public access, BUT R2 recommends using Bucket Policies or Signed URLs instead
        });
        try {
            await s3Client.send(command);
            console.log(`FileService: Successfully uploaded buffer to R2 key: ${r2Key}`);
            const publicUrl = process.env.R2_PUB_URL ? `https://${process.env.R2_PUB_URL}/${r2Key}` : undefined;
            return { success: true, key: r2Key, url: publicUrl }; // Return key and potentially public URL
        }
        catch (error) {
            console.error(`FileService: Error uploading buffer to R2 (key: ${r2Key}):`, error);
            throw new errorHandler_1.AppError(500, `Could not upload buffer to R2: ${error.message}`);
        }
    }
}
exports.FileService = FileService;
exports.default = new FileService();
