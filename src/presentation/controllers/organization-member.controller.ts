import { Request, Response, NextFunction } from 'express';
import { OrganizationMemberService } from '../../services/organization-member.service';
import { OrganizationService } from '../../services/organization.service';
import { AppError } from '../middlewares/errorHandler';
import { User } from '../../models/user.model';
import { CustomPermissions } from '../../models/organization-member.model';
import { OrganizationMember } from '../../models/organization-member.model';
import { Op } from 'sequelize';

interface MemberWithUser extends OrganizationMember {
  user: User;
}

export class OrganizationMemberController {
  static async addMember(req: Request, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;
      const { email, firstName, lastName, password, role, customPermissions } = req.body;
      let invitedBy = req.user?.id;

      // Check if the organization exists
      await OrganizationService.getOrganization(organizationId);

      // Verify invitedBy user exists if provided
      if (invitedBy) {
        const inviter = await User.findByPk(invitedBy);
        if (!inviter) {
          invitedBy = undefined; // Reset if user not found
        }
      }

      // Add the member
      const member = await OrganizationMemberService.addMember(
        organizationId,
        { email, firstName, lastName, password, role, customPermissions, invitedBy }
      );

      res.status(201).json(member);
    } catch (error) {
      next(error);
    }
  }

  static async updateMember(req: Request, res: Response, next: NextFunction) {
    try {
      const { organizationId, userId } = req.params;
      const { role, customPermissions, status, firstName, lastName } = req.body;

      // Check if the organization exists
      await OrganizationService.getOrganization(organizationId);

      console.log(userId);
      console.log(organizationId);
      console.log(role);
      console.log(customPermissions);
      console.log(status);
      console.log(firstName);
      console.log(lastName);

      // First, find the member to get the associated user
      const member = await OrganizationMember.findOne({
        where: {
          organizationId,
          id: userId,
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ]
      }) as unknown as MemberWithUser;

      if (!member) {
        throw new AppError(404, 'Member not found in the organization');
      }

      // If firstName or lastName is provided, update the user information
      if (firstName || lastName) {
        await User.update(
          {
            firstName: firstName || member.user.firstName,
            lastName: lastName || member.user.lastName
          },
          {
            where: { id: member.user.id }
          }
        );
      }

      // Update the member
      const updatedMember = await OrganizationMemberService.updateMember(
        organizationId,
        userId,
        { role, customPermissions, status }
      );

      // Fetch the updated member with fresh user data
      const refreshedMember = await OrganizationMember.findByPk(updatedMember.id, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ]
      });

      res.json(refreshedMember);
    } catch (error) {
      next(error);
    }
  }

  static async removeMember(req: Request, res: Response, next: NextFunction) {
    try {
      const { organizationId, userId } = req.params;

      // Check if the organization exists
      await OrganizationService.getOrganization(organizationId);

      // Remove the member
      await OrganizationMemberService.removeMember(organizationId, userId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  static async getOrganizationMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;
      const { role, status, search } = req.query;

      // Check if the organization exists
      await OrganizationService.getOrganization(organizationId);

      // Get members
      const members = await OrganizationMemberService.getOrganizationMembers(
        organizationId,
        {
          role: role as string,
          status: status as string,
          search: search as string
        }
      );

      res.json(members);
    } catch (error) {
      next(error);
    }
  }

  static async transferOwnership(req: Request, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;
      const { newOwnerId } = req.body;

      // Check if the organization exists
      await OrganizationService.getOrganization(organizationId);

      // Transfer ownership
      const result = await OrganizationMemberService.transferOwnership(
        organizationId,
        newOwnerId
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async checkMemberPermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const { organizationId, userId } = req.params;
      const { permissions } = req.body;

      // Get the organization
      const organization = await OrganizationService.getOrganization(organizationId);

      // Check permissions
      const permissionResults = await Promise.all(
        permissions.map(async (permission: keyof CustomPermissions) => ({
          permission,
          hasPermission: await organization.hasPermission(userId, permission)
        }))
      );

      res.json(permissionResults);
    } catch (error) {
      next(error);
    }
  }

  static async getUserOrganization(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;

      const member = await OrganizationMember.findOne({
        where: { userId },
        attributes: ['organizationId', 'role', 'customPermissions'],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ]
      }) as unknown as MemberWithUser;

      if (!member) {
        throw new AppError(404, 'User is not a member of any organization');
      }

      res.json(member);
    } catch (error) {
      next(error);
    }
  }

  static async getOrganizationUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;

      const members = await OrganizationMember.findAll({
        where: { organizationId },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email', 'isActive', 'avatar'],
          }
        ]
      }) as unknown as MemberWithUser[];

      // Transform the data to include user details and member role
      const users = members.map(member => ({
        id: member.user.id,
        firstName: member.user.firstName,
        lastName: member.user.lastName,
        email: member.user.email,
        isActive: member.user.isActive,
        avatar: member.user.avatar,
        role: member.role,
        organizationRole: member.role,
        permissions: member.customPermissions
      }));

      res.json({
        users,
        total: users.length,
        page: 1,
        totalPages: 1
      });
    } catch (error) {
      next(error);
    }
  }
} 