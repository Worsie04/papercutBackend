import { Request, Response, NextFunction } from 'express';
import { SpaceService } from '../../services/space.service';
import { AppError } from '../middlewares/errorHandler';
import { CabinetService } from '../../services/cabinet.service';

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

  static async inviteMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: spaceId } = req.params;
      const { emails, role, message } = req.body;

      if (!req.user) {
        throw new AppError(401, 'Unauthorized');
      }

      if (!Array.isArray(emails) || emails.length === 0) {
        throw new AppError(400, 'Please provide at least one email address');
      }

      if (!role) {
        throw new AppError(400, 'Please specify a role for the invitees');
      }

      // Validate role
      const validRoles = ['member', 'co-owner', 'readonly'];
      if (!validRoles.includes(role)) {
        throw new AppError(400, 'Invalid role specified');
      }

      // Get the space to check permissions
      const space = await SpaceService.getSpace(spaceId);
      
      if (!space.owner || !space.members) {
        throw new AppError(404, 'Space data is incomplete');
      }

      // Check if the current user has permission to invite members
      const currentUserId = req.user.id;
      const isOwnerOrCoOwner = space.owner.id === currentUserId || 
        space.members.some(m => {
          const memberRole = (m as any).SpaceMember?.role;
          return m.id === currentUserId && memberRole === 'co-owner';
        }); 

      if (!isOwnerOrCoOwner) {
        throw new AppError(403, 'You do not have permission to invite members');
      }

      // Send invitations
      const invitationResults = await SpaceService.inviteMembers(spaceId, {
        emails,
        role,
        message,
        inviterId: currentUserId
      });

      res.status(200).json({
        message: 'Invitations sent successfully',
        results: invitationResults
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateMemberRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: spaceId, userId } = req.params;
      const { role } = req.body;

      if (!req.user) {
        throw new AppError(401, 'Unauthorized');
      }

      if (!role) {
        throw new AppError(400, 'Role is required');
      }

      // Validate role
      const validRoles = ['member', 'co-owner', 'readonly'];
      if (!validRoles.includes(role)) {
        throw new AppError(400, 'Invalid role specified');
      }

      // Get the space to check permissions
      const space = await SpaceService.getSpace(spaceId);
      
      if (!space.owner || !space.members) {
        throw new AppError(404, 'Space data is incomplete');
      }

      // Check if the current user has permission to update roles
      const currentUserId = req.user.id;
      const isOwnerOrCoOwner = space.owner.id === currentUserId || 
        space.members.some(m => {
          const memberRole = (m as any).SpaceMember?.role;
          return m.id === currentUserId && memberRole === 'co-owner';
        });

      if (!isOwnerOrCoOwner) {
        throw new AppError(403, 'You do not have permission to update member roles');
      }

      // Update the member's role
      await SpaceService.updateMemberRole(spaceId, userId, role);

      res.status(200).json({ message: 'Member role updated successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async getCabinets(req: Request, res: Response, next: NextFunction) {
    try {
      const spaceId = req.params.id;
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