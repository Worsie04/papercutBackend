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
  reviewers: string[];
  approver?: string | null;
  name?: string;
}

// --- Added Interfaces for new request bodies ---
interface ReassignPayload {
    newUserId: string;
    reason?: string;
}

interface FinalApprovePayload {
    comment?: string;
    placements: PlacementInfo[];
}

interface FinalRejectPayload {
    reason: string; // Reason is typically required for rejection
}

interface ResubmitPayload {
  newSignedFileId?: string; // ID of the *final signed* PDF uploaded by frontend
  comment: string;
}


export class LetterController {

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authenticatedReq = req as AuthenticatedRequest;
      const userId = authenticatedReq.user?.id;
      if (!userId) { return next(new AppError(401,'Authentication required.')); }
      const { templateId, formData, name } = req.body as { templateId: string; formData: LetterFormData; name?: string; };
      if (!templateId || !formData) { return next(new AppError(400,'Missing required fields: templateId and formData.')); }
      const { logoUrl, signatureUrl, stampUrl, ...coreFormData } = formData;
      const newLetter = await LetterService.create({
        templateId, userId, formData: coreFormData, name,
        logoUrl: logoUrl ?? null, signatureUrl: signatureUrl ?? null, stampUrl: stampUrl ?? null,
      });
      res.status(201).json(newLetter);
    } catch (error) { next(error); }
  }

  static async getAllByUserId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authenticatedReq = req as AuthenticatedRequest;
      const userId = authenticatedReq.user?.id;
      if (!userId) { return next(new AppError(401,'Authentication required.')); }
      const letters = await LetterService.getAllByUserId(userId);
      res.status(200).json(letters);
    } catch (error) { next(error); }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
     try {
       const authenticatedReq = req as AuthenticatedRequest;
       const userId = authenticatedReq.user?.id;
       const letterId = req.params.id;
       if (!userId) { return next(new AppError(401,'Authentication required.')); }
       if (!letterId) { return next(new AppError(400,'Letter ID parameter is required.')); }
       const letter = await LetterService.findById(letterId, userId);
       res.status(200).json(letter);
     } catch (error) { if (error instanceof AppError) { res.status(error.statusCode || 500).json({ error: error.message }); } else { next(error); } }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
     try {
       const authenticatedReq = req as AuthenticatedRequest;
       const userId = authenticatedReq.user?.id;
       const letterId = req.params.id;
        if (!userId) { return next(new AppError(401,'Authentication required.')); }
        if (!letterId) { return next(new AppError(400,'Letter ID parameter is required.')); }
       await LetterService.delete(letterId, userId);
       res.status(204).send();
     } catch (error) { if (error instanceof AppError) { res.status(error.statusCode || 500).json({ error: error.message }); } else { next(error); } }
  }

  static async createFromPdfInteractive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const authenticatedReq = req as AuthenticatedRequest;
        const userId = authenticatedReq.user?.id;
        if (!userId) { return next(new AppError(401, 'Authentication required.')); }
        const { originalFileId, placements, name, reviewers, approver } = req.body as CreateFromPdfPayload;
        if (!originalFileId || !placements || !Array.isArray(placements) || placements.length === 0 || !reviewers || !Array.isArray(reviewers) || reviewers.length === 0) {
            return next(new AppError(400, 'Missing required fields: originalFileId, placements array, and a non-empty reviewers array.'));
        }
        for (const p of placements) {
            if (!p.type || !p.url || p.pageNumber == null || p.x == null || p.y == null || p.width == null || p.height == null) {
                 return next(new AppError(400, 'Invalid placement object structure.'));
            }
        }
        if (!reviewers.every(id => typeof id === 'string')) {
             return next(new AppError(400, 'Invalid reviewers format. Expecting an array of strings (User IDs).'));
        }
        if (approver && typeof approver !== 'string') {
             return next(new AppError(400, 'Invalid approver format. Expecting a string (User ID) or null.'));
        }
        const newSignedLetter = await LetterService.createFromPdfInteractive({
            originalFileId, placements, userId, reviewers,
            approver: approver ?? null,
            name: name ?? `Signed Document ${new Date().toISOString().split('T')[0]}`
        });
        res.status(201).json(newSignedLetter);
    } catch (error) { console.error('Error in createFromPdfInteractive controller:', error); next(error); }
  }

  static async getSignedPdfViewUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
     try {
         const authenticatedReq = req as AuthenticatedRequest;
         const userId = authenticatedReq.user?.id;
         const letterId = req.params.id;
         if (!userId) { return next(new AppError(401, 'Authentication required.')); }
         if (!letterId) { return next(new AppError(400, 'Letter ID parameter is required.')); }
         const viewUrl = await LetterService.generateSignedPdfViewUrl(letterId, userId);
         res.status(200).json({ viewUrl });
     } catch (error) { console.error(`Error in getSignedPdfViewUrl controller for letter ${req.params.id}:`, error); if (error instanceof AppError) { throw new AppError(500, 'Error in getSignedPdfViewUrl controller for letter'); } next(error); }
  }

  static async getPendingReviewLetters(req: Request, res: Response, next: NextFunction): Promise<void> {
     try {
         const authenticatedReq = req as AuthenticatedRequest;
         const userId = authenticatedReq.user?.id;
         if (!userId) { return next(new AppError(401, 'Authentication required.')); }
         const letters = await LetterService.getLettersPendingReview(userId);
         res.status(200).json(letters);
     } catch (error) { next(error); }
  }

  static async getLettersPendingMyAction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const authenticatedReq = req as AuthenticatedRequest; //
        const userId = authenticatedReq.user?.id;

        if (!userId) {
            return next(new AppError(401, 'Authentication required.'));
        }

        const letters = await LetterService.getLettersPendingMyAction(userId);
        res.status(200).json(letters);

    } catch (error) {
        console.error('Error in getLettersPendingMyAction controller:', error);
        next(error);
    }
}

  static async approveLetterReview(req: Request, res: Response, next: NextFunction): Promise<void> {
     try {
       const authenticatedReq = req as AuthenticatedRequest;
       const reviewerUserId = authenticatedReq.user?.id;
       const letterId = req.params.id;
       const { comment } = req.body;
       if (!reviewerUserId) { return next(new AppError(401, 'Authentication required.')); }
       if (!letterId) { return next(new AppError(400, 'Letter ID parameter is required.')); }
       if (comment && typeof comment !== 'string') { return next(new AppError(400, 'Invalid comment format.')); }
       // --- TODO: Change this to call the new approveStep service method ---
       const updatedLetter = await LetterService.approveStep(letterId, reviewerUserId, comment);
       res.status(200).json({ message: 'Letter review approved successfully.', letter: updatedLetter });
     } catch (error) { next(error); }
  }

  static async rejectLetterReview(req: Request, res: Response, next: NextFunction): Promise<void> {
     try {
       const authenticatedReq = req as AuthenticatedRequest;
       const reviewerUserId = authenticatedReq.user?.id;
       const letterId = req.params.id;
       const { reason } = req.body;
       if (!reviewerUserId) { return next(new AppError(401, 'Authentication required.')); }
       if (!letterId) { return next(new AppError(400, 'Letter ID parameter is required.')); }
       if (reason && typeof reason !== 'string') { return next(new AppError(400, 'Invalid rejection reason format.')); }
       // --- TODO: Change this to call the new rejectStep service method ---
       const updatedLetter = await LetterService.rejectStep(letterId, reviewerUserId, reason);
       res.status(200).json({ message: 'Letter review rejected successfully.', letter: updatedLetter });
     } catch (error) { next(error); }
  }

  // --- NEW CONTROLLER METHODS ---

  static async reassignLetterReview(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
          const authenticatedReq = req as AuthenticatedRequest;
          const currentUserId = authenticatedReq.user?.id;
          const letterId = req.params.id;
          const { newUserId, reason } = req.body as ReassignPayload;

          if (!currentUserId) { return next(new AppError(401, 'Authentication required.')); }
          if (!letterId) { return next(new AppError(400, 'Letter ID parameter is required.')); }
          if (!newUserId || typeof newUserId !== 'string') { return next(new AppError(400, 'New User ID is required for reassignment.')); }
          if (reason && typeof reason !== 'string') { return next(new AppError(400, 'Invalid reason format.')); }

          // --- TODO: Implement LetterService.reassignStep ---
          // const updatedLetter = await LetterService.reassignStep(letterId, currentUserId, newUserId, reason);
          // res.status(200).json({ message: 'Letter review reassigned successfully.', letter: updatedLetter });

          // Placeholder response until service method is implemented
          res.status(501).json({ message: 'Reassign service method not yet implemented.' });

      } catch (error) {
          next(error);
      }
  }

  static async finalApproveLetter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const authenticatedReq = req as AuthenticatedRequest; //
        const userId = authenticatedReq.user?.id;
        const letterId = req.params.id;
        const { comment,placements } = req.body as FinalApprovePayload;

        if (!userId) {
            return next(new AppError(401, 'Authentication required.'));
        }
        if (!letterId) {
            return next(new AppError(400, 'Letter ID parameter is required.'));
        }

        for (const p of placements) {
          if (!p.type || !p.url || p.pageNumber == null || p.x == null || p.y == null || p.width == null || p.height == null) {
               return next(new AppError(400, 'Invalid placement object structure.'));
          }
        }

        // Call the service method
        const approvedLetter = await LetterService.finalApproveLetter(letterId, userId,placements, comment);
        res.status(200).json({ message: 'Letter finally approved successfully.', letter: approvedLetter });

    } catch (error) {
        console.error(`Error in finalApproveLetter controller for letter ${req.params.id}:`, error);
        next(error);
    }
}

static async finalApproveLetterSingle(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
      const authenticatedReq = req as AuthenticatedRequest;
      const userId = authenticatedReq.user?.id;
      const letterId = req.params.id;
      const { comment } = req.body as FinalApprovePayload; // Extract optional comment

      if (!userId) {
          // Should ideally be caught by authentication middleware, but double-check
          return next(new AppError(401, 'Authentication required.'));
      }
      if (!letterId) {
          return next(new AppError(400, 'Letter ID parameter is required.'));
      }

      console.log(`[Controller] Attempting final approval (single/non-PDF) for letter ${letterId} by user ${userId}`);

      // Call the NEW service method
      const approvedLetter = await LetterService.finalApproveLetterSingle(letterId, userId, comment);

      res.status(200).json({ message: 'Letter finally approved successfully.', letter: approvedLetter });

  } catch (error) {
      console.error(`[Controller] Error in finalApproveLetterSingle for letter ${req.params.id}:`, error);
      // Pass error to the centralized error handler
      next(error);
  }
}

  static async finalRejectLetter(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
          const authenticatedReq = req as AuthenticatedRequest;
          const userId = authenticatedReq.user?.id; // This should be the final approver
          const letterId = req.params.id;
          const { reason } = req.body as FinalRejectPayload;

          if (!userId) { return next(new AppError(401, 'Authentication required.')); }
          if (!letterId) { return next(new AppError(400, 'Letter ID parameter is required.')); }
          if (!reason || typeof reason !== 'string') { return next(new AppError(400, 'Rejection reason is required.')); }

          // --- TODO: Implement LetterService.finalReject ---
          // const rejectedLetter = await LetterService.finalReject(letterId, userId, reason);
          // res.status(200).json({ message: 'Letter finally rejected successfully.', letter: rejectedLetter });

           // Placeholder response
           res.status(501).json({ message: 'Final reject service method not yet implemented.' });

      } catch (error) {
          next(error);
      }
  }

  static async resubmitRejectedLetter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const authenticatedReq = req as AuthenticatedRequest;
        const userId = authenticatedReq.user?.id; // This should be the original submitter
        const letterId = req.params.id;
        // --- Use the defined interface for the body ---
        const { newSignedFileId, comment } = req.body as ResubmitPayload;

        if (!userId) { return next(new AppError(401, 'Authentication required.')); }
        if (!letterId) { return next(new AppError(400, 'Letter ID parameter is required.')); }
        if (!comment || typeof comment !== 'string') { return next(new AppError(400, 'Resubmission comment is required.')); }
        if (newSignedFileId && typeof newSignedFileId !== 'string') { return next(new AppError(400, 'Invalid newSignedFileId format.')); }

        // --- Call the actual service method ---
        const resubmittedLetter = await LetterService.resubmitRejectedLetter(letterId, userId, newSignedFileId, comment);
        res.status(200).json({ message: 'Letter resubmitted successfully.', letter: resubmittedLetter });

    } catch (error) {
        console.error(`Error in resubmitRejectedLetter controller for letter ${req.params.id}:`, error);
        next(error);
    }
}


  static async getMyRejectedLetters(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const authenticatedReq = req as AuthenticatedRequest;
        const userId = authenticatedReq.user?.id;
        if (!userId) { return next(new AppError(401, 'Authentication required.')); }
        const letters = await LetterService.getMyRejectedLetters(userId);
        res.status(200).json(letters);
    } catch (error) { next(error); }
 }


}