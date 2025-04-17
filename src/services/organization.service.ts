import { Organization } from '../models/organization.model';
import { User } from '../models/user.model';
import { Admin } from '../models/admin.model';
import { AppError } from '../presentation/middlewares/errorHandler';
import { Op, Sequelize } from 'sequelize';
import { OrganizationMemberService } from './organization-member.service';

export class OrganizationService {
  
  static async createOrganization(data: {
    name: string;
    type: 'Personal' | 'Corporate';
    description?: string;
    logo?: string;
    subscription?: 'Free' | 'Pro' | 'Enterprise';
    visibility?: 'Public' | 'Private';
    domain: string;
    ownerId: string;
    ownerType: 'user' | 'admin';
  }) {
    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/i;
    if (!domainRegex.test(data.domain)) {
      throw new AppError(400, 'Invalid domain format. Please enter a valid domain (e.g., example.com)');
    }

    // Check if domain is already in use
    const existingOrg = await Organization.findOne({
      where: { domain: data.domain }
    });
    if (existingOrg) {
      throw new AppError(400, 'This domain is already registered with another organization');
    }

    // Get owner details to validate email domain
    const owner = data.ownerType === 'user' 
      ? await User.findByPk(data.ownerId)
      : await Admin.findByPk(data.ownerId);

    if (!owner) {
      throw new AppError(404, 'Owner not found');
    }

    // Create organization
    const organization = await Organization.create({
      ...data,
      owner_id: data.ownerId,
      owner_type: data.ownerType
    });

    // Add owner as super user
    await OrganizationMemberService.addMember(organization.id, {
      email: owner.email,
      role: 'super_user',
      customPermissions: {
        canCreateSpaces: true,
        canApproveSpaces: true,
        canInviteMembers: true,
        canManageRoles: true,
        canDownloadFiles: true
      }
    });

    return this.getOrganization(organization.id);
  }

  static async getOrganizations() {
    const organizations = await Organization.findAll({
      include: [
        {
          model: User,
          as: 'organizationOwner',
          required: false,
          where: Sequelize.literal('"Organization"."owner_type" = \'user\''),
          attributes: ['id', ['first_name', 'firstName'], ['last_name', 'lastName'], 'email']
        },
        {
          model: Admin,
          as: 'adminOwner',
          required: false,
          where: Sequelize.literal('"Organization"."owner_type" = \'admin\''),
          attributes: ['id', ['first_name', 'firstName'], ['last_name', 'lastName'], 'email']
        }
      ],
      order: [['createdAt', 'DESC']],
      raw: true,
      nest: true
    });

    return organizations.map(org => {
      const owner = org.owner_type === 'user' ? org.organizationOwner : org.adminOwner;
      return {
        ...org,
        owner: owner ? `${owner.firstName} ${owner.lastName}` : 'Unknown'
      };
    });
  }

  static async getOrganization(id: string) {
    const organization = await Organization.findByPk(id, {
      include: [
        {
          model: User,
          as: 'organizationOwner',
          attributes: ['id', 'first_name', 'last_name', 'email'],
          required: false
        },
        {
          model: Admin,
          as: 'adminOwner',
          attributes: ['id', 'first_name', 'last_name', 'email'],
          required: false
        }
      ],
    });

    if (!organization) {
      throw new AppError(404, 'Organization not found');
    }

    return organization;
  }

  static async updateOrganization(id: string, data: {
    name?: string;
    type?: 'Personal' | 'Corporate';
    description?: string;
    logo?: string;
    subscription?: 'Free' | 'Pro' | 'Enterprise';
    visibility?: 'Public' | 'Private';
    domain?: string;
  }) {
    const organization = await this.getOrganization(id);

    // If domain is being updated, validate it
    if (data.domain) {
      // Validate domain format
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/i;
      if (!domainRegex.test(data.domain)) {
        throw new AppError(400, 'Invalid domain format. Please enter a valid domain (e.g., example.com)');
      }

      // Check if domain is already in use by another organization
      const existingOrg = await Organization.findOne({
        where: {
          domain: data.domain,
          id: { [Op.ne]: id } // Exclude current organization
        }
      });
      if (existingOrg) {
        throw new AppError(400, 'This domain is already registered with another organization');
      }
    }

    await organization.update(data);
    return this.getOrganization(id);
  }

  static async deleteOrganization(id: string) {
    const organization = await this.getOrganization(id);
    await organization.destroy();
  }

  static async getOrganizationsByOwner(ownerId: string, ownerType: 'user' | 'admin') {
    const organizations = await Organization.findAll({
      where: {
        owner_id: ownerId,
        owner_type: ownerType
      },
      include: [
        {
          model: User,
          as: 'organizationOwner',
          attributes: ['id', 'first_name', 'last_name', 'email'],
          required: false
        },
        {
          model: Admin,
          as: 'adminOwner',
          attributes: ['id', 'first_name', 'last_name', 'email'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']],
    });
    return organizations;
  }

  static async findByDomain(domain: string): Promise<Organization | null> {
    return Organization.findOne({ where: { domain } });
  }

  static async findDomainByUserId(userId: string): Promise<string | null> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError(404, 'User not found');
    }
    const emailDomain = user.email.split('@')[1];
        
        // Find organization by domain
    const organization = await Organization.findOne({
      where: { domain: emailDomain }
    });
    return organization?.id || null;
  }
} 