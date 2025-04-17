import { Request, Response, NextFunction } from 'express';
import { OrganizationService } from '../../services/organization.service';
import { AppError } from '../middlewares/errorHandler';

export class OrganizationController {
  static async createOrganization(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const userType = req.user?.type;

      if (!userId || !userType) {
        throw new AppError(401, 'Unauthorized');
      }

      const organization = await OrganizationService.createOrganization({
        ...req.body,
        ownerId: userId,
        ownerType: userType === 'admin' ? 'admin' : 'user'
      });

      res.status(201).json(organization);
    } catch (error) {
      next(error);
    }
  }

  static async getOrganizations(req: Request, res: Response, next: NextFunction) {
    try {
      const organizations = await OrganizationService.getOrganizations();
      res.json(organizations);
    } catch (error) {
      next(error);
    }
  }

  static async getOrganization(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const organization = await OrganizationService.getOrganization(id);
      
      // Transform the response to use a consistent owner structure
      const transformedOrganization = {
        ...organization.toJSON(),
        owner: organization.getOwner()
      };

      res.json(transformedOrganization);
    } catch (error) {
      next(error);
    }
  }

  static async updateOrganization(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const userType = req.user?.type;

      if (!userId || !userType) {
        throw new AppError(401, 'Unauthorized');
      }

      // Get the organization to check ownership
      const organization = await OrganizationService.getOrganization(id);
      if (organization.owner_id !== userId || organization.owner_type !== (userType === 'admin' ? 'admin' : 'user')) {
        throw new AppError(403, 'You do not have permission to update this organization');
      }

      const updatedOrganization = await OrganizationService.updateOrganization(id, req.body);
      
      // Transform the response to use a consistent owner structure
      const transformedOrganization = {
        ...updatedOrganization.toJSON(),
        owner: updatedOrganization.getOwner()
      };

      res.json(transformedOrganization);
    } catch (error) {
      next(error);
    }
  }

  static async deleteOrganization(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const userType = req.user?.type;

      if (!userId || !userType) {
        throw new AppError(401, 'Unauthorized');
      }

      // Get the organization to check ownership
      const organization = await OrganizationService.getOrganization(id);
      if (organization.owner_id !== userId || organization.owner_type !== (userType === 'admin' ? 'admin' : 'user')) {
        throw new AppError(403, 'You do not have permission to delete this organization');
      }

      await OrganizationService.deleteOrganization(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  static async getUserOrganizations(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const userType = req.user?.type;

      if (!userId || !userType) {
        throw new AppError(401, 'Unauthorized');
      }

      const organizations = await OrganizationService.getOrganizationsByOwner(userId, userType === 'admin' ? 'admin' : 'user');
      
      const transformedOrganizations = organizations.map(org => ({
        ...org.toJSON(),
        owner: org.getOwner()
      }));
     // console.log(transformedOrganizations);
      res.json(transformedOrganizations);
    } catch (error) {
      next(error);
    }
  }

  static async findDomainByUserId(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const domain = await OrganizationService.findDomainByUserId(userId);
      res.json(domain);
    } catch (error) {
      next(error);
    }
  }
} 