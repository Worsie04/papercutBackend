import { Request, Response, NextFunction } from 'express';
import { imageService } from '../../services/image.service'; 
import { AppError } from '../middlewares/errorHandler';
import { StatusCodes } from 'http-status-codes';

export class ImageController {

    static async getUserImages(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return next(new AppError(StatusCodes.UNAUTHORIZED, 'Authentication required.'));
            }
            const images = await imageService.listUserImages(userId);
            res.status(StatusCodes.OK).json(images);
        } catch (error) {
            next(error);
        }
    }

    static async uploadNewImage(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return next(new AppError(StatusCodes.UNAUTHORIZED, 'Authentication required.'));
            }
            if (!req.file) {
                return next(new AppError(StatusCodes.BAD_REQUEST, 'No image file uploaded.'));
            }

            const newImage = await imageService.uploadImage(userId, req.file);
            res.status(StatusCodes.CREATED).json({
                url: newImage.publicUrl // CKEditor expects 'url'
            });
        } catch (error) {
            next(error);
        }
    }

    static async deleteUserImage(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.id;
            const imageId = req.params.imageId; // Route parametrindən

            if (!userId) {
                return next(new AppError(StatusCodes.UNAUTHORIZED, 'Authentication required.'));
            }
            if (!imageId) {
                return next(new AppError(StatusCodes.BAD_REQUEST, 'Image ID is required.'));
            }

            await imageService.deleteImage(userId, imageId);
            res.status(StatusCodes.NO_CONTENT).send();
        } catch (error) {
            next(error);
        }
    }
}