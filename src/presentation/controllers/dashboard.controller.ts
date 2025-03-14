import { Request, Response } from 'express';
import { DashboardService } from '../../services/dashboard.service';
import { OrganizationMember } from '../../models/organization-member.model';

export class DashboardController {
  /**
   * Get dashboard statistics
   */
  static async getDashboardStats(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      const userId = req.user.id;
      
      // Get the user's organization through OrganizationMember
      const organizationMember = await OrganizationMember.findOne({
        where: {
          userId,
          status: 'active'
        }
      });
      
      if (!organizationMember) {
        res.status(404).json({ error: 'User is not a member of any organization' });
        return;
      }
      
      const organizationId = organizationMember.organizationId;
      
      const stats = await DashboardService.getDashboardStats(userId, organizationId);
      
      res.status(200).json(stats);
    } catch (error) {
      console.error('Error getting dashboard statistics:', error);
      res.status(500).json({ error: 'Failed to get dashboard statistics' });
    }
  }
} 