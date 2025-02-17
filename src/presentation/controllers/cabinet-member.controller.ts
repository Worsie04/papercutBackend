import { Request, Response } from 'express';
import { CabinetMemberService } from '../../services/cabinet-member.service';
import { AppError } from '../middlewares/errorHandler';
import { CabinetMemberPermissions } from '@/models/cabinet-member.model';

export class CabinetMemberController {
  static async assignUsers(req: Request, res: Response) {
    try {
      const { cabinetIds, userIds, permissions } = req.body;
      await CabinetMemberService.assignUsers(cabinetIds, userIds, permissions);
      res.json({ message: 'Users assigned successfully' });
    } catch (error) {
      console.error('Assign users error:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Failed to assign users' });
      }
    }
  }

  static async getCabinetMembers(req: Request, res: Response) {
    try {
      const { cabinetId } = req.params;
      const members = await CabinetMemberService.getCabinetMembers(cabinetId);
      res.json(members);
    } catch (error) {
      console.error('Get cabinet members error:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Failed to fetch cabinet members' });
      }
    }
  }

  static async getUserCabinets(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const cabinets = await CabinetMemberService.getUserCabinets(userId);
      res.json(cabinets);
    } catch (error) {
      console.error('Get user cabinets error:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Failed to fetch user cabinets' });
      }
    }
  }

  static async updateMemberPermissions(req: Request, res: Response) {
    try {
      const { cabinetId, userId } = req.params;
      const { permissions } = req.body;
      const member = await CabinetMemberService.updateMemberPermissions(
        cabinetId,
        userId,
        permissions
      );
      res.json(member);
    } catch (error) {
      console.error('Update member permissions error:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Failed to update member permissions' });
      }
    }
  }

  static async removeMember(req: Request, res: Response) {
    try {
      const { cabinetId, userId } = req.params;
      await CabinetMemberService.removeMember(cabinetId, userId);
      res.json({ message: 'Member removed successfully' });
    } catch (error) {
      console.error('Remove member error:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Failed to remove member' });
      }
    }
  }

  static async getMemberPermissions(req: Request, res: Response) {
    try {
      const { cabinetId, userId } = req.params;
      const permissions = await CabinetMemberService.getMemberPermissions(cabinetId, userId);
      res.json(permissions);
    } catch (error) {
      console.error('Get member permissions error:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Failed to fetch member permissions' });
      }
    }
  }

  static async checkMemberAccess(req: Request, res: Response) {
    try {
      const { cabinetId, userId } = req.params;
      const { permission } = req.query;

      if (!permission || typeof permission !== 'string') {
        throw new AppError(400, 'Permission parameter is required');
      }

      const hasAccess = await CabinetMemberService.checkMemberAccess(
        cabinetId,
        userId,
        permission as keyof CabinetMemberPermissions
      );
      res.json({ hasAccess });
    } catch (error) {
      console.error('Check member access error:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Failed to check member access' });
      }
    }
  }

  static async getMember(req: Request, res: Response) {
    try {
      const { cabinetId, userId } = req.params;
      const member = await CabinetMemberService.getMember(cabinetId, userId);
      
      if (member === null) {
        // User has access but is not a member (approver or creator)
        res.json({
          isMember: false,
          hasAccess: true,
          message: 'User has access but is not a cabinet member'
        });
      } else {
        // User is a cabinet member
        res.json({
          isMember: true,
          hasAccess: true,
          member
        });
      }
    } catch (error) {
      console.error('Get member error:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ 
          isMember: false,
          hasAccess: false,
          message: error.message 
        });
      } else {
        res.status(500).json({ 
          isMember: false,
          hasAccess: false,
          message: 'Failed to fetch member information' 
        });
      }
    }
  }
} 