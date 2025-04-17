import { OrganizationMember, CustomPermissions } from '../models/organization-member.model';
import { Organization } from '../models/organization.model';
import { User } from '../models/user.model';
import { Admin } from '../models/admin.model';
import { AppError } from '../presentation/middlewares/errorHandler';
import { Op } from 'sequelize';

type OrganizationRole = 'system_admin' | 'owner' | 'co_owner' | 'super_user' | 'member_full' | 'member_read' | 'guest';

// Define role hierarchy and permissions
const ROLE_HIERARCHY: Record<OrganizationRole, number> = {
  system_admin: 100,
  owner: 90,
  co_owner: 80,
  super_user: 70,
  member_full: 50,
  member_read: 30,
  guest: 10
};

// Helper function to check if a role has higher or equal privileges
const hasHigherOrEqualPrivilege = (role1: string, role2: string): boolean => {
  return (ROLE_HIERARCHY[role1 as OrganizationRole] || 0) >= (ROLE_HIERARCHY[role2 as OrganizationRole] || 0);
};

// Helper function to get default permissions based on role
const getDefaultPermissions = (role: string): CustomPermissions => {
  switch (role) {
    case 'system_admin':
    case 'owner':
    case 'co_owner':
    case 'super_user':
      return {
        canCreateSpaces: true,
        canApproveSpaces: true,
        canInviteMembers: true,
        canManageRoles: true,
        canDownloadFiles: true,
        canEditFields: ['*'],
        restrictedFields: []
      };
    case 'member_full':
      return {
        canCreateSpaces: true,
        canApproveSpaces: false,
        canInviteMembers: true,
        canManageRoles: false,
        canDownloadFiles: true,
        canEditFields: ['*'],
        restrictedFields: []
      };
    case 'member_read':
      return {
        canCreateSpaces: false,
        canApproveSpaces: false,
        canInviteMembers: false,
        canManageRoles: false,
        canDownloadFiles: true,
        canEditFields: [],
        restrictedFields: ['*']
      };
    case 'guest':
      return {
        canCreateSpaces: false,
        canApproveSpaces: false,
        canInviteMembers: false,
        canManageRoles: false,
        canDownloadFiles: false,
        canEditFields: [],
        restrictedFields: ['*']
      };
    default:
      return {
        canCreateSpaces: false,
        canApproveSpaces: false,
        canInviteMembers: false,
        canManageRoles: false,
        canDownloadFiles: false,
        canEditFields: [],
        restrictedFields: ['*']
      };
  }
};

export class OrganizationMemberService {
  static async addMember(
    organizationId: string,
    data: {
      email: string;
      firstName?: string;
      lastName?: string;
      password?: string;
      role: string;
      customPermissions?: CustomPermissions;
      invitedBy?: string;
    }
  ) {
    // Get the organization to check domain
    const organization = await Organization.findByPk(organizationId);
    if (!organization) {
      throw new AppError(404, 'Organization not found');
    }

    // Extract domain from email
    const emailDomain = data.email.split('@')[1];
    
    // Always validate domain for all roles
    if (emailDomain !== organization.domain) {
      throw new AppError(400, `Only users with @${organization.domain} email addresses can be added to this organization`);
    }

    // First try to find the user by email
    let user = await User.findOne({
      where: { email: data.email }
    });

    let userId;
    let userType = data.role === 'super_admin' ? 'admin' : 'user';

    // If user doesn't exist, create a new one
    if (!user) {
      user = await User.create({
        email: data.email,
        firstName: data.firstName || data.email.split('@')[0],  // Default to email prefix if not provided
        lastName: data.lastName || '',  // Default to empty string if not provided
        isActive: true,
        emailVerifiedAt: new Date(),
        password: data.password || Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12)
      });
      userId = user.id;
    } else {
      // If user exists and firstName/lastName are provided, update them
      if (data.firstName || data.lastName) {
        await user.update({
          firstName: data.firstName || user.firstName,
          lastName: data.lastName || user.lastName
        });
      }
      userId = user.id;
    }

    // Check if the user is already a member
    const existingMember = await OrganizationMember.findOne({
      where: {
        organizationId,
        userId,
      }
    });

    if (existingMember) {
      throw new AppError(400, 'User is already a member of this organization');
    }

    // Set default permissions based on role
    const permissions = data.customPermissions || getDefaultPermissions(data.role);

    // Create the member
    const member = await OrganizationMember.create({
      organizationId,
      userId,
      userType,
      role: data.role,
      customPermissions: permissions,
      invitedBy: data.invitedBy || null,
      status: 'active'
    });

    return this.getMember(member.id);
  }

  static async updateMember(
    organizationId: string,
    userId: string,
    updates: {
      role?: string;
      customPermissions?: CustomPermissions;
      status?: 'active' | 'suspended';
    }
  ) {
    //console.log(userId)
    const member = await OrganizationMember.findOne({
      where: {
        organizationId,
        id:userId,
        
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    if (!member) {
      throw new AppError(404, 'Member not found in the organization or is suspended');
    }

    // Prevent updating roles with higher privileges
    if (updates.role && !hasHigherOrEqualPrivilege(member.role, updates.role)) {
      throw new AppError(403, 'Cannot assign a role with higher privileges than your own');
    }

    // If role is being updated, set default permissions unless custom ones are provided
    if (updates.role && !updates.customPermissions) {
      updates.customPermissions = getDefaultPermissions(updates.role);
    }

    // Update user type if role changes to/from system_admin
    if (updates.role) {
      const userType = updates.role === 'super_admin' ? 'admin' : 'user';
      await member.update({ ...updates, userType });
    } else {
      await member.update(updates);
    }

    return this.getMember(member.id);
  }

  static async removeMember(organizationId: string, userId: string) {
    const member = await OrganizationMember.findOne({
      where: {
        organizationId,
        id:userId
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ]
    });

    if (!member) {
      throw new AppError(404, 'Member not found');
    }

    // Prevent removing the owner
    if (member.role === 'owner') {
      throw new AppError(403, 'Cannot remove the organization owner');
    }

    await member.destroy();
  }

  static async getMember(id: string) {
    const member = await OrganizationMember.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: Organization,
          as: 'organization',
          attributes: ['id', 'name', 'type']
        },
        {
          model: User,
          as: 'inviter',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ]
    });

    if (!member) {
      throw new AppError(404, 'Member not found');
    }

    return member;
  }

  static async getOrganizationMembers(
    organizationId: string,
    query?: {
      role?: string;
      status?: string;
      search?: string;
    }
  ) {
    const where: any = {
      organizationId
    };

    if (query?.role) {
      where.role = query.role;
    }

    if (query?.status) {
      where.status = query.status;
    }

    const members = await OrganizationMember.findAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email'],
          where: query?.search ? {
            [Op.or]: [
              { first_name: { [Op.iLike]: `%${query.search}%` } },
              { last_name: { [Op.iLike]: `%${query.search}%` } },
              { email: { [Op.iLike]: `%${query.search}%` } }
            ]
          } : undefined
        },
        {
          model: User,
          as: 'inviter',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return members;
  }

  static async transferOwnership(organizationId: string, newOwnerId: string) {
    // Get current owner
    const currentOwner = await OrganizationMember.findOne({
      where: {
        organizationId,
        role: 'owner'
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ]
    });

    if (!currentOwner) {
      throw new AppError(404, 'Current owner not found');
    }

    // Get new owner
    const newOwner = await OrganizationMember.findOne({
      where: {
        organizationId,
        userId: newOwnerId
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ]
    });

    if (!newOwner) {
      throw new AppError(404, 'New owner not found in organization members');
    }

    // Start transaction
    const t = await OrganizationMember.sequelize!.transaction();

    try {
      // Update current owner to admin
      await currentOwner.update({
        role: 'admin'
      }, { transaction: t });

      // Update new owner
      await newOwner.update({
        role: 'owner'
      }, { transaction: t });

      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }

    return {
      previousOwner: await this.getMember(currentOwner.id),
      newOwner: await this.getMember(newOwner.id)
    };
  }
} 