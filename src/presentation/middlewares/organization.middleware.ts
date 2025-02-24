import { Response, NextFunction } from 'express';
import { OrganizationService } from '../../services/organization.service';
import { OrganizationMemberService } from '../../services/organization-member.service';
import { AppError } from './errorHandler';
import { AuthenticatedRequest } from '../../types/express';

export async function checkOrganizationPermissions(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { organizationId } = req.params;
    const userId = req.user?.id;
    const userType = req.user?.type;

    if (!userId || !userType) {
      throw new AppError(401, 'Unauthorized');
    }

    // Super admins can access all organizations
    if (userType === 'super_admin') {
      return next();
    }

    // Get the organization
    const organization = await OrganizationService.getOrganization(organizationId);

    // Check if user is the owner of the organization
    if (organization.owner_id === userId && organization.owner_type === userType) {
      return next();
    }

    // For regular users and admins, check organization membership
    const member = await OrganizationMemberService.getOrganizationMembers(organizationId, {
      role: undefined,
      status: 'active'
    });

    const userMember = member.find(m => m.userId === userId);

    if (!userMember) {
      throw new AppError(403, 'You do not have access to this organization');
    }

    // Check specific permissions based on the request method
    switch (req.method) {
      case 'GET':
        // All active members can view
        return next();

      case 'POST':
      case 'PATCH':
      case 'PUT':
        // Only owners, co-owners, system admins, and super users can modify
        if (
          userMember.role === 'owner' ||
          userMember.role === 'co_owner' ||
          userMember.role === 'system_admin' ||
          userMember.role === 'super_user' ||
          (userMember.role === 'member_full' &&
            userMember.customPermissions?.canManageRoles)
        ) {
          return next();
        }
        break;

      case 'DELETE':
        // Only owners and system admins can delete
        if (
          userMember.role === 'owner' ||
          userMember.role === 'system_admin' ||
          userMember.role === 'super_user'
        ) {
          return next();
        }
        break;
    }

    throw new AppError(403, 'You do not have permission to perform this action');
  } catch (error) {
    next(error);
  }
}

export async function checkOrganizationOwnership(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { organizationId } = req.params;
    const userId = req.user?.id;
    const userType = req.user?.type;

    if (!userId || !userType) {
      throw new AppError(401, 'Unauthorized');
    }

    // Super admins can access all organizations
    if (userType === 'super_admin') {
      return next();
    }

    // Get the organization
    const organization = await OrganizationService.getOrganization(organizationId);

    // Check if user is the owner
    if (organization.owner_id === userId && organization.owner_type === userType) {
      return next();
    }

    throw new AppError(403, 'Only organization owners can perform this action');
  } catch (error) {
    next(error);
  }
} 