import { Request, Response, NextFunction } from 'express';
import { SpaceService } from '../../services/space.service';
import { AppError } from '../middlewares/errorHandler';

export class SpaceController {
  static async createSpace(req: Request, res: Response, next: NextFunction) {
      console.log("req.user:", req.user);
      console.log("req.body:", req.body);
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError(401, 'Unauthorized');
      }

      // Parse JSON strings for arrays
      const body = {
        ...req.body,
        tags: req.body.tags ? JSON.parse(req.body.tags) : [],
        users: req.body.users ? JSON.parse(req.body.users) : [],
        requireApproval: req.body.requireApproval === 'true',
      };

      const space = await SpaceService.createSpace({
        ...body,
        logo: (req as any).file,
        ownerId: userId,
      });

      res.status(201).json(space);
    } catch (error) {
      next(error);
    }
  }

  static async getSpace(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const space = await SpaceService.getSpace(id);
      res.json(space);
    } catch (error) {
      next(error);
    }
  }

  static async addMember(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { userId, role } = req.body;

      await SpaceService.addMember(id, userId, role);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  static async removeMember(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, userId } = req.params;
      await SpaceService.removeMember(id, userId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  static async getAvailableUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await SpaceService.getAvailableUsers();
      res.json(users);
    } catch (error) {
      next(error);
    }
  }

  static async getAllSpaces(req: Request, res: Response, next: NextFunction) {
    try {
      const spaces = await SpaceService.getAllSpaces();
      res.json(spaces);
    } catch (error) {
      next(error);
    }
  }
} 