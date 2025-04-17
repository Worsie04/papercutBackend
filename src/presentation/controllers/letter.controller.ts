import { Request, Response, NextFunction } from 'express';
import { LetterService } from '../../services/letter.service';
import { AuthenticatedRequest } from '../../types/express'; 
import { LetterFormData } from '../../models/letter.model'; 
import { AppError } from '../middlewares/errorHandler';


interface PlacementInfo {
  type: 'signature' | 'stamp';
  url: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
}
interface CreateFromPdfPayload {
  originalFileId: string;
  placements: PlacementInfo[];
  name?: string; // Optional name for the new letter
}
export class LetterController {

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authenticatedReq = req as AuthenticatedRequest;
      const userId = authenticatedReq.user?.id;

      if (!userId) {
        return next(new AppError(401,'Authentication required.'));
      }
      const { templateId, formData, name } = req.body as {
          templateId: string;
          formData: LetterFormData;
          name?: string;
      };

      if (!templateId || !formData) {
         return next(new AppError(401,'Missing required fields: templateId and formData.'));
      }

      const { logoUrl, signatureUrl, stampUrl, ...coreFormData } = formData;

      const newLetter = await LetterService.create({
        templateId,
        userId,
        formData: coreFormData, // Pass only the core data
        name,
        logoUrl: logoUrl ?? null, // Pass URLs separately
        signatureUrl: signatureUrl ?? null,
        stampUrl: stampUrl ?? null,
      });

      res.status(201).json(newLetter);

    } catch (error) {
      next(error);
    }
  }

  static async getAllByUserId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authenticatedReq = req as AuthenticatedRequest;
      const userId = authenticatedReq.user?.id;

      if (!userId) {
        return next(new AppError(401,'Authentication required.'));
      }

      const letters = await LetterService.getAllByUserId(userId);
      res.status(200).json(letters);

    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authenticatedReq = req as AuthenticatedRequest;
      const userId = authenticatedReq.user?.id;
      const letterId = req.params.id;

      if (!userId) {
        console.log('User ID not found in request.');
        return next(new AppError(401,'Authentication required.'));
      }
      if (!letterId) {
        console.log('Letter ID parameter is missing.');
         return next(new AppError(400,'Letter ID parameter is required.'));
      }

      // Now userId and letterId are guaranteed to be strings
      const letter = await LetterService.findById(letterId, userId);
      res.status(200).json(letter);

    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode || 500).json({ error: error.message });
        } else {
            next(error);
        }
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authenticatedReq = req as AuthenticatedRequest;
      const userId = authenticatedReq.user?.id;
      const letterId = req.params.id;

       if (!userId) {
         return next(new AppError(401,'Authentication required.'));
      }
       if (!letterId) {
          return next(new AppError(401,'Letter ID parameter is required.'));
      }

      await LetterService.delete(letterId, userId);

      res.status(204).send();

    } catch (error) {
       if (error instanceof AppError) {
            res.status(error.statusCode || 500).json({ error: error.message });
        } else {
            next(error);
        }
    }
  }

  static async createFromPdfInteractive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const authenticatedReq = req as AuthenticatedRequest;
        const userId = authenticatedReq.user?.id;

        if (!userId) {
            return next(new AppError(401, 'Authentication required.'));
        }

        const { originalFileId, placements, name } = req.body as CreateFromPdfPayload;

        if (!originalFileId || !placements || !Array.isArray(placements) || placements.length === 0) {
            return next(new AppError(400, 'Missing required fields: originalFileId and a non-empty placements array.'));
        }

        // Basic validation for placements (can be expanded)
        for (const p of placements) {
            if (!p.type || !p.url || p.pageNumber == null || p.x == null || p.y == null || p.width == null || p.height == null) {
                 return next(new AppError(400, 'Invalid placement object structure.'));
            }
        }

        console.log(`Controller: Received request to create letter from PDF ${originalFileId} for user ${userId}`);

        // Call the new service method
        const newSignedLetter = await LetterService.createFromPdfInteractive({
            originalFileId,
            placements,
            userId,
            name: name ?? `Signed Document ${new Date().toISOString()}` // Provide a default name
        });

        // Respond with the newly created letter details (especially the signedPdfUrl)
        res.status(201).json(newSignedLetter);

    } catch (error) {
        console.error('Error in createFromPdfInteractive controller:', error);
        next(error); // Pass error to the error handling middleware
    }
  }

  static async getSignedPdfViewUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const authenticatedReq = req as AuthenticatedRequest;
        const userId = authenticatedReq.user?.id;
        const letterId = req.params.id;

        if (!userId) {
            return next(new AppError(401, 'Authentication required.'));
        }
        if (!letterId) {
            return next(new AppError(400, 'Letter ID parameter is required.'));
        }

        console.log(`Controller: Requesting view URL for letter ${letterId} by user ${userId}`);

        // Call the new service method
        const viewUrl = await LetterService.generateSignedPdfViewUrl(letterId, userId);

        // Respond with the generated URL
        res.status(200).json({ viewUrl });

    } catch (error) {
        console.error(`Error in getSignedPdfViewUrl controller for letter ${req.params.id}:`, error);

        if (error instanceof AppError) {
             throw new AppError(500, 'Error in getSignedPdfViewUrl controller for letter');
        }

        next(error);
    }
  }

  static async getPendingReviewLetters(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const authenticatedReq = req as AuthenticatedRequest;
        const userId = authenticatedReq.user?.id;
        console.log('Approver"s Authenticated user ID:', userId);

        if (!userId) {
            return next(new AppError(401, 'Authentication required.'));
        }

        const letters = await LetterService.getLettersPendingReview(userId);
        res.status(200).json(letters);

    } catch (error) {
        next(error);
    }
  }

  static async approveLetterReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authenticatedReq = req as AuthenticatedRequest;
      const reviewerUserId = authenticatedReq.user?.id;
      const letterId = req.params.id;
      const { comment } = req.body; // Optional comment from request body

      if (!reviewerUserId) {
        return next(new AppError(401, 'Authentication required.'));
      }
      if (!letterId) {
        return next(new AppError(400, 'Letter ID parameter is required.'));
      }
      if (comment && typeof comment !== 'string') {
          return next(new AppError(400, 'Invalid comment format.'));
      }

      const updatedLetter = await LetterService.approveReview(letterId, reviewerUserId, comment);
      res.status(200).json({ message: 'Letter review approved successfully.', letter: updatedLetter });

    } catch (error) {
       next(error);
    }
  }


  static async rejectLetterReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authenticatedReq = req as AuthenticatedRequest;
      const reviewerUserId = authenticatedReq.user?.id;
      const letterId = req.params.id;
      const { reason } = req.body;

      if (!reviewerUserId) {
        return next(new AppError(401, 'Authentication required.'));
      }
      if (!letterId) {
        return next(new AppError(400, 'Letter ID parameter is required.'));
      }
      if (reason && typeof reason !== 'string') {
         return next(new AppError(400, 'Invalid rejection reason format.'));
      }

      const updatedLetter = await LetterService.rejectReview(letterId, reviewerUserId, reason);
      res.status(200).json({ message: 'Letter review rejected successfully.', letter: updatedLetter });

    } catch (error) {
       next(error);
    }
  }



}
