// src/presentation/controllers/publicLetter.controller.ts
import { Request, Response, NextFunction } from 'express';
import { PublicLetterService } from '../../services/publicLetter.service'; 
import { UploadService } from '../../services/upload.service'; // To generate view URL
import { AppError } from '../middlewares/errorHandler';

export class PublicLetterController {
    static async getPublicLetter(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const letterId = req.params.id;
            if (!letterId) {
                return next(new AppError(400, 'Letter ID parameter is required.'));
            }
            // Call the specific public service method
            const publicData = await PublicLetterService.getPublicLetterDetails(letterId);
            res.status(200).json(publicData);
        } catch (error) {
            console.error(`Error in getPublicLetter controller for ID ${req.params.id}:`, error);
            next(error); // Let error handler manage response
        }
    }

    // Get a view URL for a PDF using its R2 key (publicly accessible)
    static async getPublicPdfViewUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const key = req.params.key; // Get key from URL path segment
            if (!key) {
                 return next(new AppError(400, 'File key parameter is required.'));
            }
            console.log(`Generating public view URL for key: ${key}`);
            // Use existing UploadService method, assuming it doesn't require auth for GET
            const viewUrl = await UploadService.getFileViewUrl(key);
            res.json({ viewUrl });
        } catch (error) {
             console.error(`Error generating public PDF view URL for key ${req.params.key}:`, error);
             next(error);
        }
    }
}