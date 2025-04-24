"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicLetterController = void 0;
const publicLetter_service_1 = require("../../services/publicLetter.service");
const upload_service_1 = require("../../services/upload.service"); // To generate view URL
const errorHandler_1 = require("../middlewares/errorHandler");
class PublicLetterController {
    static async getPublicLetter(req, res, next) {
        try {
            const letterId = req.params.id;
            if (!letterId) {
                return next(new errorHandler_1.AppError(400, 'Letter ID parameter is required.'));
            }
            // Call the specific public service method
            const publicData = await publicLetter_service_1.PublicLetterService.getPublicLetterDetails(letterId);
            res.status(200).json(publicData);
        }
        catch (error) {
            console.error(`Error in getPublicLetter controller for ID ${req.params.id}:`, error);
            next(error); // Let error handler manage response
        }
    }
    // Get a view URL for a PDF using its R2 key (publicly accessible)
    static async getPublicPdfViewUrl(req, res, next) {
        try {
            const key = req.params.key; // Get key from URL path segment
            if (!key) {
                return next(new errorHandler_1.AppError(400, 'File key parameter is required.'));
            }
            console.log(`Generating public view URL for key: ${key}`);
            // Use existing UploadService method, assuming it doesn't require auth for GET
            const viewUrl = await upload_service_1.UploadService.getFileViewUrl(key);
            res.json({ viewUrl });
        }
        catch (error) {
            console.error(`Error generating public PDF view URL for key ${req.params.key}:`, error);
            next(error);
        }
    }
}
exports.PublicLetterController = PublicLetterController;
