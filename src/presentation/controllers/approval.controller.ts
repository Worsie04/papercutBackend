import { Request, Response } from 'express';
import { CabinetService } from '../../services/cabinet.service';
import { SpaceService } from '../../services/space.service';

export class ApprovalController {
  static async getApprovals(req: Request, res: Response) {
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
        createdBy: cabinet.createdBy,
        createdAt: cabinet.createdAt,
        priority: 'Med',
      }));

      // Fetch pending space creation requests
      const pendingSpaces = await SpaceService.getPendingApprovals(userId);
      const spaceRequests = pendingSpaces.map(space => ({
        id: space.id,
        type: 'space',
        name: space.name,
        createdBy: space.createdBy,
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

  static async approveRequest(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { type } = req.body;

      if (type === 'cabinet') {
        await CabinetService.approveCabinet(id);
      } else if (type === 'space') {
        await SpaceService.approveSpace(id);
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

      if (type === 'cabinet') {
        await CabinetService.rejectCabinet(id, reason);
      } else if (type === 'space') {
        await SpaceService.rejectSpace(id, reason);
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