import { Request, Response, NextFunction } from 'express';
import { signatureService } from '../../services/signature.service'; 
import { AppError } from '../middlewares/errorHandler';
import { StatusCodes } from 'http-status-codes';
import { SignatureType } from '../../models/signature.model';

export class SignatureController {

    static async getUserSignatures(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return next(new AppError(StatusCodes.UNAUTHORIZED, 'Authentication required.'));
            }
            const signatures = await signatureService.listUserSignatures(userId);
            res.status(StatusCodes.OK).json(signatures);
        } catch (error) {
            next(error);
        }
    }

    static async uploadSignature(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return next(new AppError(StatusCodes.UNAUTHORIZED, 'Authentication required.'));
            }
            if (!req.file) {
                return next(new AppError(StatusCodes.BAD_REQUEST, 'No signature file uploaded.'));
            }

            // Check signature type from request body
            const signatureType = req.body.signatureType as SignatureType || SignatureType.UPLOADED;
            
            // Validate signature type
            if (!Object.values(SignatureType).includes(signatureType)) {
                return next(new AppError(StatusCodes.BAD_REQUEST, 'Invalid signature type.'));
            }

            const newSignature = await signatureService.uploadSignature(userId, req.file, signatureType);
            res.status(StatusCodes.CREATED).json({
                id: newSignature.id,
                publicUrl: newSignature.publicUrl,
                filename: newSignature.filename,
                signatureType: newSignature.signatureType,
                createdAt: newSignature.createdAt
            });
        } catch (error) {
            next(error);
        }
    }

    static async deleteSignature(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.id;
            const signatureId = req.params.signatureId;

            if (!userId) {
                return next(new AppError(StatusCodes.UNAUTHORIZED, 'Authentication required.'));
            }
            if (!signatureId) {
                return next(new AppError(StatusCodes.BAD_REQUEST, 'Signature ID is required.'));
            }

            await signatureService.deleteSignature(userId, signatureId);
            res.status(StatusCodes.NO_CONTENT).send();
        } catch (error) {
            next(error);
        }
    }

    static async getSignatureById(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.id;
            const signatureId = req.params.signatureId;

            if (!userId) {
                return next(new AppError(StatusCodes.UNAUTHORIZED, 'Authentication required.'));
            }
            if (!signatureId) {
                return next(new AppError(StatusCodes.BAD_REQUEST, 'Signature ID is required.'));
            }

            const signature = await signatureService.getSignatureById(userId, signatureId);
            res.status(StatusCodes.OK).json({
                id: signature.id,
                url: signature.publicUrl,
                filename: signature.filename,
                signatureType: signature.signatureType,
                createdAt: signature.createdAt
            });
        } catch (error) {
            next(error);
        }
    }
} 