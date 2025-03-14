import { Request, Response, NextFunction } from 'express';
import { SpaceService } from '../../services/space.service';
import { AppError } from '../middlewares/errorHandler';
import { CabinetService } from '../../services/cabinet.service';

// Constants and Types
const VALID_ROLES = ['member', 'co-owner', 'readonly'] as const;
const VALID_STATUSES = ['pending', 'approved', 'rejected'] as const;

type SpaceRole = typeof VALID_ROLES[number];
type SpaceStatus = typeof VALID_STATUSES[number];

interface AuthenticatedRequest extends Request {
  user?: { id: string; email: string; type: string; role?: string };
}

interface SpaceMember {
  id: string;
  SpaceMember?: {
    role: SpaceRole;
  };
}

export class SpaceController {
  // region: Utility Methods
  private static validateUser(req: AuthenticatedRequest): string {
    const userId = req.user?.id;
    if (!userId) throw new AppError(401, 'Unauthorized');
    return userId;
  }

  private static validateStatus(status: unknown): SpaceStatus {
    if (!status || typeof status !== 'string') {
      throw new AppError(400, 'Status parameter is required');
    }
    if (!VALID_STATUSES.includes(status as SpaceStatus)) {
      throw new AppError(400, `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
    }
    return status as SpaceStatus;
  }

  private static validateRole(role: unknown): SpaceRole {
    if (!role) throw new AppError(400, 'Role is required');
    if (!VALID_ROLES.includes(role as SpaceRole)) {
      throw new AppError(400, `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`);
    }
    return role as SpaceRole;
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private static async checkSpacePermissions(spaceId: string, userId: string): Promise<void> {
    const space = await SpaceService.getSpace(spaceId);
    
    if (!space.owner || !space.members) {
      throw new AppError(404, 'Space data is incomplete');
    }
    
    // User is authorized if they are:
    // 1. The space owner
    // 2. A space member with 'co-owner' role
    // 3. A super user from the organization (We'll check this in the service layer)
    const isAuthorized = 
      // Check if user is the space owner
      space.owner.id === userId || 
      // Check if user is a co-owner
      space.members.some((m: SpaceMember) => 
        m.id === userId && m.SpaceMember?.role === 'co-owner'
      );
    
    if (!isAuthorized) {
      // If not owner or co-owner, we'll let the service layer handle the super_user check
      // during specific operations like deleteSpace that allow super_user access
      throw new AppError(403, 'Insufficient permissions');
    }
  }
  // endregion

  // region: Core Space Operations
  static async createSpace(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = SpaceController.validateUser(req);
      
      const parsedBody = {
        ...req.body,
        tags: req.body.tags ? JSON.parse(req.body.tags) : [],
        users: req.body.users ? JSON.parse(req.body.users) : [],
        approvers: req.body.approvers ? JSON.parse(req.body.approvers) : [],
        requireApproval: req.body.requireApproval === 'true',
        logo: (req as any).file,
        ownerId: userId,
      };

      const space = await SpaceService.createSpace(parsedBody);
      res.status(201).json(space);
    } catch (error) {
      next(error);
    }
  }

  static async getSpace(req: Request, res: Response, next: NextFunction) {
    try {
      const space = await SpaceService.getSpace(req.params.id);
      res.json(space);
    } catch (error) {
      next(error);
    }
  }

  static async deleteSpace(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id: spaceId } = req.params;
      const userId = SpaceController.validateUser(req);
      
      // Skip the permission check here - the service layer will handle it
      // The service layer checks for space owners and super_users
      await SpaceService.deleteSpace(spaceId, userId);
      
      res.status(200).json({ message: 'Space deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
  // endregion

  // region: Member Management
  static async addMember(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id: spaceId } = req.params;
      const userId = SpaceController.validateUser(req);
      const { userId: memberId, role } = req.body;

      await SpaceController.checkSpacePermissions(spaceId, userId);
      await SpaceService.addMember(spaceId, memberId, SpaceController.validateRole(role));
      
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  static async removeMember(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id: spaceId, userId: memberId } = req.params;
      const userId = SpaceController.validateUser(req);

      await SpaceController.checkSpacePermissions(spaceId, userId);
      await SpaceService.removeMember(spaceId, memberId);
      
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  static async updateMemberRole(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id: spaceId, userId: memberId } = req.params;
      const userId = SpaceController.validateUser(req);
      const role = SpaceController.validateRole(req.body.role);

      await SpaceController.checkSpacePermissions(spaceId, userId);
      await SpaceService.updateMemberRole(spaceId, memberId, role);
      
      res.status(200).json({ message: 'Member role updated successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async inviteMembers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id: spaceId } = req.params;
      const userId = SpaceController.validateUser(req);
      const { emails, role, message } = req.body;

      if (!Array.isArray(emails)) {
        throw new AppError(400, 'Invalid email list format');
      }

      await SpaceController.checkSpacePermissions(spaceId, userId);

      const validatedEmails = emails.filter(email => 
        typeof email === 'string' && SpaceController.isValidEmail(email)
      );
      
      const results = await SpaceService.inviteMembers(spaceId, {
        emails: validatedEmails,
        role: SpaceController.validateRole(role),
        message: message?.toString() || '',
        inviterId: userId
      });

      res.status(200).json({
        message: `${results.length} invitations sent successfully`,
        results
      });
    } catch (error) {
      next(error);
    }
  }
  // endregion

  // region: Query Endpoints
  static async getAllSpaces(_req: Request, res: Response, next: NextFunction) {
    try {
      const spaces = await SpaceService.getAllSpaces();
      res.json(spaces);
    } catch (error) {
      next(error);
    }
  }

  static async getSpacesByStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const status = SpaceController.validateStatus(req.query.status);
      const spaces = await SpaceService.getSpacesByStatus(status);
      res.json(spaces);
    } catch (error) {
      next(error);
    }
  }

  static async getMySpacesByStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = SpaceController.validateUser(req);
      const status = SpaceController.validateStatus(req.query.status);
      
      const spaces = await SpaceService.getMySpacesByStatus(userId, status);
      res.json(spaces);
    } catch (error) {
      next(error);
    }
  }

  static async getAvailableUsers(_req: Request, res: Response, next: NextFunction) {
    try {
      const users = await SpaceService.getAvailableUsers();
      res.json(users);
    } catch (error) {
      next(error);
    }
  }

  static async getSuperUsers(_req: Request, res: Response, next: NextFunction) {
    try {
      const superUsers = await SpaceService.getSuperUsers();
      res.json(superUsers);
    } catch (error) {
      next(error);
    }
  }
  // endregion

  // region: Approval Workflow
  static async getSpacesWaitingForMyApproval(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const spaces = await SpaceService.getApprovalsWaitingFor(SpaceController.validateUser(req));
      res.json(spaces);
    } catch (error) {
      next(error);
    }
  }

  static async reassignApproval(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id: spaceId } = req.params;
      const userId = SpaceController.validateUser(req);
      
      await SpaceService.reassignApproval(
        spaceId,
        userId,
        req.body.assigneeId,
        req.body.message?.toString() || ''
      );
      
      res.status(200).json({ message: 'Approval reassigned successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async resubmitSpace(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const space = await SpaceService.resubmitSpace(
        req.params.id,
        req.body.message?.toString() || '',
        SpaceController.validateUser(req)
      );
      
      res.status(200).json({ message: 'Space resubmitted successfully', space });
    } catch (error) {
      next(error);
    }
  }

  static async getReassignmentHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const history = await SpaceService.getReassignmentHistory(req.params.id);
      res.json(history);
    } catch (error) {
      next(error);
    }
  }
  // endregion

  // region: Cabinet Integration
  static async getCabinets(req: Request, res: Response, next: NextFunction) {
    try {
      const cabinets = await CabinetService.getApprovedCabinets(req.params.id);
      res.json(cabinets);
    } catch (error) {
      next(error);
    }
  }
  // endregion
}