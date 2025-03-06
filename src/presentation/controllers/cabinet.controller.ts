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
      console.log(cabinet)
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

  static async approveCabinet(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        throw new AppError(401, 'User not authenticated');
      }

      const cabinet = await CabinetService.approveCabinet(id, userId);
      res.json(cabinet);
    } catch (error) {
      next(error);
    }
  }

  static async rejectCabinet(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const { reason } = req.body;
      
      if (!userId) {
        throw new AppError(401, 'User not authenticated');
      }

      const cabinet = await CabinetService.rejectCabinet(id, userId, reason);
      res.json(cabinet);
    } catch (error) {
      next(error);
    }
  }

  static async assignCabinetsToUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { userIds, cabinetIds, spaceId } = req.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        throw new AppError(400, 'At least one user ID is required');
      }

      if (!Array.isArray(cabinetIds) || cabinetIds.length === 0) {
        throw new AppError(400, 'At least one cabinet ID is required');
      }

      if (!spaceId) {
        throw new AppError(400, 'Space ID is required');
      }

      await CabinetService.assignCabinetsToUsers(userIds, cabinetIds, spaceId);

      res.status(200).json({
        message: 'Cabinets assigned successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async assignUsersWithPermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const { assignments, spaceId } = req.body;

      if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
        throw new AppError(400, 'Invalid assignments data');
      }

      if (!spaceId) {
        throw new AppError(400, 'Space ID is required');
      }

      // Validate each assignment
      assignments.forEach(assignment => {
        if (!assignment.userId || !assignment.cabinetId || !assignment.role || !assignment.permissions) {
          throw new AppError(400, 'Invalid assignment data');
        }

        const requiredPermissions = [
          'readRecords',
          'createRecords',
          'updateRecords',
          'deleteRecords',
          'manageCabinet',
          'downloadFiles',
          'exportTables'
        ];

        requiredPermissions.forEach(perm => {
          if (typeof assignment.permissions[perm] !== 'boolean') {
            throw new AppError(400, `Invalid permission value for ${perm}`);
          }
        });
      });

      await CabinetService.assignUsersWithPermissions(assignments, spaceId);

      res.status(200).json({
        message: 'Users assigned to cabinets with permissions successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMyCabinetsByStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.query;
      const userId = req.user?.id;
      
      if (!status || typeof status !== 'string') {
        throw new AppError(400, 'Status parameter is required');
      }
      
      if (!userId) {
        throw new AppError(401, 'Unauthorized');
      }
      
      const validStatuses = ['pending', 'approved', 'rejected'];
      if (!validStatuses.includes(status)) {
        throw new AppError(400, 'Invalid status. Must be one of: pending, approved, rejected');
      }
      
      // Get cabinets created by the current user with the specified status
      const cabinets = await CabinetService.getMyPendingApprovals(userId);
      res.json(cabinets);
    } catch (error) {
      next(error);
    }
  }

  static async getCabinetsWaitingForMyApproval(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        throw new AppError(401, 'Unauthorized');
      }
      
      // Get cabinets waiting for this user's approval
      const cabinets = await CabinetService.getApprovalsWaitingFor(userId);
      res.json(cabinets);
    } catch (error) {
      next(error);
    }
  }
}