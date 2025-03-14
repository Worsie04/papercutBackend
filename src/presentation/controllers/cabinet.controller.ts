import { Request, Response, NextFunction } from 'express';
import { CabinetService } from '../../services/cabinet.service';
import { AppError } from '../middlewares/errorHandler';
import { Cabinet } from '../../models/cabinet.model';
import { CabinetMemberPermission } from '../../models/cabinet-member-permission.model';
import { Record } from '../../models/record.model';
import { OrganizationMember } from '../../models/organization-member.model';
import { User } from '../../models/user.model';
import { Op } from 'sequelize';

// Define the authenticated request interface
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    type: string;
    role?: string;
  };
}

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

  static deleteCabinet = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      // Debug log to see what's in the user object
      console.log('User object:', req.user);
      
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized - User not authenticated' });
        return;
      }

      // First check if the cabinet exists
      const cabinet = await Cabinet.findByPk(id);
      
      if (!cabinet) {
        res.status(404).json({ error: 'Cabinet not found' });
        return;
      }

      // Check if user is the owner of the cabinet
      const isOwner = cabinet.createdById === userId;
      
      // Find the user's organization role from organization_members table
      const orgMember = await OrganizationMember.findOne({
        where: { 
          userId: userId,
          status: 'active'
        },
        attributes: ['role']
      });
      
      console.log('Organization member role:', orgMember?.role);
      
      // Check if user is a super_user or admin (who can delete any cabinet)
      const isSuperUser = orgMember?.role === 'super_user' || 
                         orgMember?.role === 'system_admin' || 
                         orgMember?.role === 'owner' ||
                         orgMember?.role === 'co_owner';
      
      if (!isOwner && !isSuperUser) {
        // If not owner or super_user, check if user has delete permissions for this cabinet
        const { fn, col, where } = require('sequelize');
        
        const memberPermission = await CabinetMemberPermission.findOne({
          where: { 
            cabinetId: id,
            userId: userId,
            [Op.and]: [
              where(fn('JSONB_EXTRACT_PATH_TEXT', col('permissions'), 'deleteRecords'), 'true')
            ]
          }
        });
        
        if (!memberPermission) {
          res.status(403).json({ error: 'You do not have permission to delete this cabinet' });
          return;
        }
      }

      // Delete associated records directly by cabinetId
      await Record.destroy({
        where: { cabinetId: id }
      });

      // Delete the cabinet directly by ID
      await Cabinet.destroy({
        where: { id }
      });
      
      res.status(200).json({ message: 'Cabinet deleted successfully' });
    } catch (error) {
      console.error('Error deleting cabinet:', error);
      res.status(500).json({ error: 'An error occurred while deleting the cabinet' });
    }
  }
}