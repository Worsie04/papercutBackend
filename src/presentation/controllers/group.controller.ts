import { Request, Response, NextFunction } from 'express';
import { GroupService } from '../../services/group.service';
import { AppError } from '../middlewares/errorHandler';
import { Group } from '../../models/group.model';

export class GroupController {
  static async createGroup(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError(401, 'User not authenticated');
      }

      const { name, description, organizationId } = req.body;
      
      const group = await GroupService.createGroup({
        name,
        description,
        organizationId,
        createdBy: userId
      });

      res.status(201).json(group);
    } catch (error) {
      next(error);
    }
  }

  static async getGroups(req: Request, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;
      if (!organizationId) {
        throw new AppError(400, 'Organization ID is required');
      }

      const groups = await GroupService.getGroups(organizationId);
      res.json(groups);
    } catch (error) {
      next(error);
    }
  }

  static async getGroupById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const group = await GroupService.getGroupById(id);
      if (!group) {
        throw new AppError(404, 'Group not found');
      }
      res.json(group);
    } catch (error) {
      next(error);
    }
  }

  static async updateGroup(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, description } = req.body;
      const group = await GroupService.updateGroup(id, {
        name,
        description
      });
      res.json(group);
    } catch (error) {
      next(error);
    }
  }

  static async deleteGroup(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await GroupService.deleteGroup(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  static async addUsersToGroup(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError(401, 'User not authenticated');
      }

      // Handle both /assign and /:groupId/members formats
      const { groupId } = req.params;
      const { userIds, groupIds } = req.body;

      if (groupId) {
        // Single group format (/:groupId/members)
        const updatedGroup = await GroupService.addUsersToGroup(groupId, userIds, userId);
        res.json(updatedGroup);
      } else if (groupIds && Array.isArray(groupIds)) {
        // Multiple groups format (/assign)
        const results = await Promise.all(
          groupIds.map(gId => GroupService.addUsersToGroup(gId, userIds, userId))
        );
        res.json(results);
      } else {
        throw new AppError(400, 'Either groupId parameter or groupIds in body is required');
      }
    } catch (error) {
      next(error);
    }
  }

  static async removeUsersFromGroup(req: Request, res: Response, next: NextFunction) {
    try {
      const { groupId } = req.params;
      const { userIds } = req.body;
      
      const updatedGroup = await GroupService.removeUsersFromGroup(groupId, userIds);
      res.json(updatedGroup);
    } catch (error) {
      next(error);
    }
  }

  static async updatePermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { permissions } = req.body;

      // Validate permissions object
      if (!permissions || typeof permissions !== 'object') {
        throw new AppError(400, 'Invalid permissions format');
      }

      const requiredPermissions = ['readRecords', 'manageCabinet', 'downloadFiles', 'exportTables'];
      for (const perm of requiredPermissions) {
        if (typeof permissions[perm] !== 'boolean') {
          throw new AppError(400, `Invalid permission value for ${perm}`);
        }
      }

      // Find the group
      const group = await Group.findByPk(id);
      if (!group) {
        throw new AppError(404, 'Group not found');
      }

      // Update permissions
      await group.update({ permissions });

      res.status(200).json({
        message: 'Group permissions updated successfully',
        group,
      });
    } catch (error) {
      next(error);
    }
  }
} 