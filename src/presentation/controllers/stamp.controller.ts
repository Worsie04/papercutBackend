import { Request, Response, NextFunction } from 'express';
import { stampService } from '../../services/stamp.service'; 
import { AppError } from '../middlewares/errorHandler';
import { StatusCodes } from 'http-status-codes';
import { StampType } from '../../models/stamp.model';

export class StampController {

    static async getUserStamps(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return next(new AppError(StatusCodes.UNAUTHORIZED, 'Authentication required.'));
            }
            const stamps = await stampService.listUserStamps(userId);
            res.status(StatusCodes.OK).json(stamps);
        } catch (error) {
            next(error);
        }
    }

    static async uploadStamp(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return next(new AppError(StatusCodes.UNAUTHORIZED, 'Authentication required.'));
            }
            if (!req.file) {
                return next(new AppError(StatusCodes.BAD_REQUEST, 'No stamp file uploaded.'));
            }

            // Check stamp type from request body
            const stampType = req.body.stampType as StampType || StampType.UPLOADED;
            
            // Validate stamp type
            if (!Object.values(StampType).includes(stampType)) {
                return next(new AppError(StatusCodes.BAD_REQUEST, 'Invalid stamp type.'));
            }

            const newStamp = await stampService.uploadStamp(userId, req.file, stampType);
            res.status(StatusCodes.CREATED).json({
                id: newStamp.id,
                publicUrl: newStamp.publicUrl,
                filename: newStamp.filename,
                stampType: newStamp.stampType,
                createdAt: newStamp.createdAt
            });
        } catch (error) {
            next(error);
        }
    }

    static async deleteStamp(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.id;
            const stampId = req.params.stampId;

            if (!userId) {
                return next(new AppError(StatusCodes.UNAUTHORIZED, 'Authentication required.'));
            }
            if (!stampId) {
                return next(new AppError(StatusCodes.BAD_REQUEST, 'Stamp ID is required.'));
            }

            await stampService.deleteStamp(userId, stampId);
            res.status(StatusCodes.NO_CONTENT).send();
        } catch (error) {
            next(error);
        }
    }

    static async getStampById(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.id;
            const stampId = req.params.stampId;

            if (!userId) {
                return next(new AppError(StatusCodes.UNAUTHORIZED, 'Authentication required.'));
            }
            if (!stampId) {
                return next(new AppError(StatusCodes.BAD_REQUEST, 'Stamp ID is required.'));
            }

            const stamp = await stampService.getStampById(userId, stampId);
            res.status(StatusCodes.OK).json({
                id: stamp.id,
                url: stamp.publicUrl,
                filename: stamp.filename,
                stampType: stamp.stampType,
                createdAt: stamp.createdAt
            });
        } catch (error) {
            next(error);
        }
    }
} 