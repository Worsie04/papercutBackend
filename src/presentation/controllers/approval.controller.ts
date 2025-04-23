import { Request, Response } from 'express';
import { SpaceService } from '../../services/space.service';
import { CabinetService } from '../../services/cabinet.service';
import { SpaceCommentService } from '../../services/space-comment.service';
import { AuthenticatedRequest } from '../../types/express';
import { RecordService } from '../../services/record.service';
import { Record as RecordModel } from '../../models/record.model';

interface Creator {
  id: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  email: string;
}

interface RecordWithCreator extends RecordModel {
  creator?: Creator;
}

export class ApprovalController {
  /**
   * Get all pending approvals
   */
  static async getApprovals(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Fetch pending cabinet creation requests
      const pendingCabinets = await CabinetService.getPendingApprovals(userId);
      const cabinetRequests = pendingCabinets.map(cabinet => ({
        id: cabinet.id,
        type: 'cabinet',
        name: cabinet.name,
        createdBy: cabinet.createdBy.name,
        createdAt: cabinet.createdAt,
        priority: 'Med',
      }));

      // Fetch pending space creation requests
      const pendingSpaces = await SpaceService.getPendingApprovals(userId);
      const spaceRequests = pendingSpaces.map(space => ({
        id: space.id,
        type: 'space',
        name: space.name,
        createdBy: space.createdBy.name,
        createdAt: space.createdAt,
        priority: 'Med',
      }));

      // Combine all requests
      const allRequests = [...cabinetRequests, ...spaceRequests];
      
      // Sort by creation date, newest first
      allRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json(allRequests);
    } catch (error) {
      console.error('Error fetching approvals:', error);
      res.status(500).json({ error: 'Failed to fetch approvals' });
    }
  }

  /**
   * Get pending approvals that were created by the user
   */
  static async getMyPendingApprovals(req: AuthenticatedRequest, res: Response) {
    try {
      const { status } = req.query;
      const userId = req.user?.id;
      const statusStr = typeof status === 'string' ? status : '';

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Fetch pending cabinet creation requests created by current user
      const pendingCabinets = await CabinetService.getMyPendingApprovals(userId, statusStr);
      const cabinetRequests = pendingCabinets.map(cabinet => ({
        id: cabinet.id,
        type: 'cabinet',
        name: cabinet.name,
        createdBy: cabinet.createdBy,
        createdAt: cabinet.createdAt,
        status: 'pending',
        priority: 'Med',
      }));

      // Fetch pending space creation requests created by current user
      const pendingSpaces = await SpaceService.getMyPendingApprovals(userId);
      const spaceRequests = pendingSpaces.map(space => ({
        id: space.id,
        type: 'space',
        name: space.name,
        createdBy: space.owner,
        createdAt: space.createdAt,
        status: 'pending',
        priority: 'Med',
      }));

      // Combine all requests
      const allRequests = [...cabinetRequests, ...spaceRequests];
      
      // Sort by creation date, newest first
      allRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json(allRequests);
    } catch (error) {
      console.error('Error fetching my pending approvals:', error);
      res.status(500).json({ error: 'Failed to fetch your pending approvals' });
    }
  }

  /**
   * Get approvals that are waiting for the user
   */
  static async getApprovalsWaitingForMe(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const pendingRecords = await RecordService.getRecordsWaitingForMyApproval(userId);
      const recordRequests = pendingRecords.map((record: RecordWithCreator) => ({
        id: record.id,
        type: 'record',
        name: record.title,
        createdBy: record.creator ? {
          id: record.creator.id,
          name: `${record.creator.firstName} ${record.creator.lastName}`,
          avatar: record.creator.avatar
        } : {
          id: record.creatorId,
          name: 'Unknown User',
          avatar: null
        },
        createdAt: record.createdAt,
        status: 'pending',
        priority: 'Med',
      }));

      // Fetch cabinet creation requests waiting for current user's approval
      const pendingCabinets = await CabinetService.getApprovalsWaitingFor(userId);
      const cabinetRequests = pendingCabinets.map(cabinet => ({
        id: cabinet.id,
        type: 'cabinet',
        name: cabinet.name,
        createdBy: cabinet.createdBy,
        createdAt: cabinet.createdAt,
        status: 'pending',
        priority: 'Med',
      }));



      // Combine all requests
      const allRequests = [...cabinetRequests, ...recordRequests];
      
      // Sort by creation date, newest first
      allRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json(allRequests);
    } catch (error) {
      console.error('Error fetching approvals waiting for me:', error);
      res.status(500).json({ error: 'Failed to fetch approvals waiting for you' });
    }
  }

  static async approveRequest(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { type } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      if (type === 'cabinet') {
        await CabinetService.approveCabinet(id, userId);
      } else if (type === 'space') {
        await SpaceService.approveSpace(id, userId);
        
        // Store the approval as a comment
        const comment = req.body.comment;
        if (comment && comment.trim()) {
          await SpaceCommentService.createComment({
            spaceId: id,
            userId,
            message: comment,
            type: 'approval'
          });
        }
      } else {
        return res.status(400).json({ error: 'Invalid request type' });
      }

      res.json({ message: 'Request approved successfully' });
    } catch (error) {
      console.error('Error approving request:', error);
      res.status(500).json({ error: 'Failed to approve request' });
    }
  }

  static async rejectRequest(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { type, reason } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      if (type === 'cabinet') {
        await CabinetService.rejectCabinet(id, userId, reason);
      } else if (type === 'space') {
        await SpaceService.rejectSpace(id, reason, userId);
        
        // Store the rejection reason as a comment
        if (reason && reason.trim()) {
          await SpaceCommentService.createComment({
            spaceId: id,
            userId,
            message: reason,
            type: 'rejection'
          });
        }
      } else {
        return res.status(400).json({ error: 'Invalid request type' });
      }

      res.json({ message: 'Request rejected successfully' });
    } catch (error) {
      console.error('Error rejecting request:', error);
      res.status(500).json({ error: 'Failed to reject request' });
    }
  }
}