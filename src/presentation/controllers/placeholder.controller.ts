// placeholder.controller.ts
import { Request, Response, NextFunction } from 'express';
import { placeholderService } from '../../services/placeholder.service';
import { AppError } from '../middlewares/errorHandler';
import { StatusCodes } from 'http-status-codes';

declare global {
  namespace Express {
    interface User { id: string; }
    interface Request { user?: User; }
  }
}

export class PlaceholderController {
  static async getPlaceholders(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(new AppError(StatusCodes.UNAUTHORIZED, 'Authentication required.'));
      }
      const placeholders = await placeholderService.getAllForUser(userId);
      res.status(StatusCodes.OK).json(placeholders);
    } catch (error) {
      next(error);
    }
  }

  static async createPlaceholder(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(new AppError(StatusCodes.UNAUTHORIZED, 'Authentication required.'));
      }
      const { name,orgName, type, initialValue } = req.body;
      if (!name || !type) {
        return next(new AppError(StatusCodes.BAD_REQUEST, 'Name and type are required.'));
      }
      const newPlaceholder = await placeholderService.create(userId, { name,orgName, type, initialValue });
      res.status(StatusCodes.CREATED).json(newPlaceholder);
    } catch (error) {
      next(error);
    }
  }

  static async deletePlaceholder(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const placeholderId = req.params.id;
      if (!userId) {
        return next(new AppError(StatusCodes.UNAUTHORIZED, 'Authentication required.'));
      }
      if (!placeholderId) {
        return next(new AppError(StatusCodes.BAD_REQUEST, 'Placeholder ID is required.'));
      }
      await placeholderService.deleteById(userId, placeholderId);
      res.status(StatusCodes.NO_CONTENT).send();
    } catch (error) {
      next(error);
    }
  }

  // Optional: Include update if needed
  static async updatePlaceholder(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const placeholderId = req.params.id;
      const { name, type, initialValue } = req.body;
      if (!userId) {
        return next(new AppError(StatusCodes.UNAUTHORIZED, 'Authentication required.'));
      }
      if (!placeholderId) {
        return next(new AppError(StatusCodes.BAD_REQUEST, 'Placeholder ID is required.'));
      }
      const updatedPlaceholder = await placeholderService.updateById(userId, placeholderId, { name, type, initialValue });
      res.status(StatusCodes.OK).json(updatedPlaceholder);
    } catch (error) {
      next(error);
    }
  }

  static async checkAndFindPlaceholder(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const placeholderName = req.params.placeholderName;
      if (!userId) {
        return next(new AppError(StatusCodes.UNAUTHORIZED, 'Authentication required.'));
      }

      const placeholder = await placeholderService.checkAndFindPlaceholder(placeholderName);
      
      if (!placeholder) {
        return res.status(StatusCodes.NOT_FOUND).json({ 
          error: `Placeholder "${placeholderName}" not found.`,
          found: false 
        });
      }
      
      res.status(StatusCodes.OK).json({ 
        ...placeholder,
        found: true 
      });
    } catch (error) {
      next(error);
    }
  }
}