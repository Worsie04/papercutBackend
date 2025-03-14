import { Request, Response, NextFunction } from 'express';
import { ActivityService } from '../../services/activity.service';
import { ResourceType } from '../../models/activity.model';
import { AuthenticatedRequest } from '../../types/express';
import { OrganizationMember } from '../../models/organization-member.model';

export class ActivityController {
  /**
   * Get recent activities for authenticated user
   */
  static async getRecentActivities(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const activities = await ActivityService.getRecentActivities(userId);
      res.json(activities);
    } catch (error) {
      console.error('Error getting recent activities:', error);
      res.status(500).json({ error: 'Failed to get recent activities' });
    }
  }

  /**
   * Get activities for an organization
   */
  static async getOrganizationActivities(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get user's organization ID from query params
      const { organizationId } = req.query;
      if (!organizationId) {
        return res.status(400).json({ error: 'Organization ID is required' });
      }

      const activities = await ActivityService.getOrganizationActivities(organizationId as string);
      res.json(activities);
    } catch (error) {
      console.error('Error getting organization activities:', error);
      res.status(500).json({ error: 'Failed to get organization activities' });
    }
  }

  /**
   * Get activities for a space
   */
  static async getSpaceActivities(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { id } = req.params;
      const { filter, from, to } = req.query;
      const dateRange = from && to ? { from: new Date(from as string), to: new Date(to as string) } : undefined;

      const activities = await ActivityService.getResourceActivities(ResourceType.SPACE, id, filter as string, dateRange);
      res.json(activities);
    } catch (error) {
      console.error('Error getting space activities:', error);
      res.status(500).json({ error: 'Failed to get space activities' });
    }
  }

  /**
   * Get activities for a cabinet
   */
  static async getCabinetActivities(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { id } = req.params;
      const { filter, from, to } = req.query;
      const dateRange = from && to ? { from: new Date(from as string), to: new Date(to as string) } : undefined;

      const activities = await ActivityService.getResourceActivities(ResourceType.CABINET, id, filter as string, dateRange);
      res.json(activities);
    } catch (error) {
      console.error('Error getting cabinet activities:', error);
      res.status(500).json({ error: 'Failed to get cabinet activities' });
    }
  }

  /**
   * Get activities for a record
   */
  static async getRecordActivities(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { id } = req.params;
      const { filter, from, to } = req.query;
      const dateRange = from && to ? { from: new Date(from as string), to: new Date(to as string) } : undefined;

      const activities = await ActivityService.getResourceActivities(ResourceType.RECORD, id, filter as string, dateRange);
      res.json(activities);
    } catch (error) {
      console.error('Error getting record activities:', error);
      res.status(500).json({ error: 'Failed to get record activities' });
    }
  }
}