import { Request, Response, NextFunction } from 'express';
import { CabinetService } from '../../services/cabinet.service';
import { AppError } from '../middlewares/errorHandler';

export class CabinetController {
  static async createCabinet(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const body = {
        ...req.body,
        createdById: userId,
        tags: Array.isArray(req.body.tags) ? req.body.tags : JSON.parse(req.body.tags || '[]'),
        members: Array.isArray(req.body.members) ? req.body.members : JSON.parse(req.body.members || '[]'),
        approvers: Array.isArray(req.body.approvers) ? req.body.approvers : JSON.parse(req.body.approvers || '[]'),
        customFields: Array.isArray(req.body.customFields) ? req.body.customFields : JSON.parse(req.body.customFields || '[]')
      };

      const cabinet = await CabinetService.createCabinet(body);
      res.status(201).json(cabinet);
    } catch (error) {
      next(error);
    }
  }

  static async getCabinet(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const cabinet = await CabinetService.getCabinet(id);
      res.json(cabinet);
    } catch (error) {
      next(error);
    }
  }

  static async getCabinets(req: Request, res: Response, next: NextFunction) {
    try {
      const { spaceId } = req.query;
      if (!spaceId || typeof spaceId !== 'string') {
        throw new AppError(400, 'Space ID is required');
      }
      const cabinets = await CabinetService.getCabinets(spaceId);
      res.json(cabinets);
    } catch (error) {
      next(error);
    }
  }

  static async getApprovedCabinets(req: Request, res: Response, next: NextFunction) {
    try {
      const { spaceId } = req.query;
      if (!spaceId || typeof spaceId !== 'string') {
        throw new AppError(400, 'Space ID is required');
      }
      const cabinets = await CabinetService.getApprovedCabinets(spaceId);
      res.json(cabinets);
    } catch (error) {
      next(error);
    }
  }
} 