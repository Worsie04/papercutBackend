import { Op, Transaction } from 'sequelize';
import { User } from '../models/user.model';
import { Role } from '../models/role.model';
import { AppError } from '../presentation/middlewares/errorHandler';
import { JwtUtil } from '../utils/jwt.util';
import { sequelize } from '../infrastructure/database/sequelize';
import { Organization } from '../models/organization.model';
import { OrganizationMemberService } from './organization-member.service';
import { CabinetMember } from '../models/cabinet-member.model';
import { Cabinet } from '../models/cabinet.model';
import { CabinetMemberPermission } from '../models/cabinet-member-permission.model';
import { OrganizationService } from './organization.service';
import { GroupService } from './group.service';
import { OrganizationMember } from '../models/organization-member.model';

interface GetUsersParams {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface GetUsersResponse {
  users: User[];
  total: number;
  page: number;
  totalPages: number;
}

interface UserSelectOption {
  value: string;
  label: string;
}


export class UserService {
  static async getUsers({
    page,
    limit,
    search,
    sortBy = 'created_at',
    sortOrder = 'desc',
  }: GetUsersParams): Promise<GetUsersResponse> {
    const offset = (page - 1) * limit;

    const whereClause = search
      ? {
          [Op.or]: [
            { email: { [Op.iLike]: `%${search}%` } },
            { firstName: { [Op.iLike]: `%${search}%` } },
            { lastName: { [Op.iLike]: `%${search}%` } },
          ],
        }
      : {};

    const { count, rows } = await User.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [[sortBy, sortOrder]],
      attributes: ['id', 'email', 'firstName', 'lastName', 'createdAt', 'updatedAt', 'avatar', 'isActive', 'position'],
      include: [{
        model: Role,
        as: 'Roles',
        through: { attributes: [] }
      }],
      raw: false
    });

    return {
      users: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    };
  }


  static async getReviewers({
    sortBy = 'firstName',
    sortOrder = 'asc',
  }: Partial<GetUsersParams>): Promise<UserSelectOption[]> {

    const reviewers = await User.findAll({
        where: {
            position: 'reviewer',
            isActive: true
        },
        order: [[sortBy, sortOrder]],
        attributes: ['id', 'firstName', 'lastName'],
        raw: true
    });

    return reviewers.map(user => ({
        value: user.id,
        label: `${user.firstName} ${user.lastName}`.trim()
    }));
  }


  static async getApprovers({
    sortBy = 'firstName',
    sortOrder = 'asc',
  }: Partial<GetUsersParams>): Promise<UserSelectOption[]> {

    const approvers = await User.findAll({
        where: {
            position: 'approver',
            isActive: true
        },
        order: [[sortBy, sortOrder]],
        attributes: ['id', 'firstName', 'lastName'],
        raw: true
    });

    return approvers.map(user => ({
        value: user.id,
        label: `${user.firstName} ${user.lastName}`.trim()
    }));
  }

  static async getSuperUsers(userId: string): Promise<User[]> {
    // Find the organizations the current user belongs to
    const userOrganizations = await OrganizationMember.findAll({
      where: {
        userId: userId,
        status: 'active'
      },
      attributes: ['organizationId']
    });
    
    if (!userOrganizations || userOrganizations.length === 0) {
      return [];
    }
    
    // Extract organization IDs
    const organizationIds = userOrganizations.map((org: any) => org.organizationId);
    
    // Find all organization members with 'super_user' role in these organizations
    const superUserMembers = await OrganizationMember.findAll({
      where: {
        organizationId: organizationIds,
        role: 'super_user',
        status: 'active'
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
      }]
    });
    
    // Extract and return the user objects
    // Use type assertion and get() to safely extract the user objects
    const superUsers = superUserMembers
      .map((member: any) => {
        const memberData = member.get({ plain: true });
        return memberData.user;
      })
      .filter((user: any) => user !== null && user !== undefined);
    
    return superUsers;
  }

  static async getUser(id: string): Promise<User> {
    const user = await User.findByPk(id, {
      include: [{
        model: Role,
        as: 'Roles',
        through: { attributes: [] }
      }]
    });
    if (!user) {
      throw new AppError(404, 'User not found');
    }
    return user;
  }

  static async createUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
    phone?: string;
    isActive?: boolean;
    position?: string;
  }): Promise<User> {
    const existingUser = await User.findOne({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new AppError(400, 'Email already in use');
    }

    // Find the role
    const role = await Role.findOne({
      where: { name: data.role }
    });

    if (!role) {
      throw new AppError(400, 'Invalid role specified');
    }

    // Create user and assign role in a transaction
    const user = await sequelize.transaction(async (transaction: Transaction) => {
      const newUser = await User.create(data, { transaction });
      await newUser.addRole(role, { transaction });
      return newUser;
    });

    // Fetch the user with role information
    return this.getUser(user.id);
  }

  static async updateUser(
    id: string,
    data: {
      email?: string;
      firstName?: string;
      lastName?: string;
      role?: string;
      phone?: string;
      isActive?: boolean;
      position?: string;
      password?: string;
      magicLinkToken?: string;
      magicLinkTokenExpiresAt?: Date;
    }
  ): Promise<User> {
    const user = await User.findByPk(id, {
      include: [{
        model: Role,
        as: 'Roles',
        through: { attributes: [] }
      }]
    });
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    if (data.email && data.email !== user.email) {
      const existingUser = await User.findOne({
        where: { email: data.email },
      });

      if (existingUser) {
        throw new AppError(400, 'Email already in use');
      }
    }

    // Handle role update if provided
    if (data.role) {
      const role = await Role.findOne({
        where: { name: data.role }
      });

      if (!role) {
        throw new AppError(400, 'Invalid role specified');
      }

      await sequelize.transaction(async (transaction: Transaction) => {
        await user.update(data, { transaction });
        await user.setRoles([role], { transaction });
      });
    } else {
      await user.update(data);
    }
    console.log('User updated:', data.position);
    return this.getUser(id);
  }

  static async deleteUser(id: string): Promise<void> {
    const user = await User.findByPk(id);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    await user.destroy();
  }

  static async generateVerificationToken(id: string): Promise<string> {
    const user = await User.findByPk(id);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    if (user.emailVerifiedAt) {
      throw new AppError(400, 'Email already verified');
    }

    return JwtUtil.generateToken({
      id: user.id,
      email: user.email,
      type: 'user',
    });
  }

  static async findByEmail(email: string): Promise<User | null> {
    return User.findOne({ where: { email } });
  }

  static async findById(id: string): Promise<User | null> {
    return User.findByPk(id);
  }

  static async create(data: Partial<User>): Promise<User> {
    return User.create(data as User);
  }

  static async getUserCabinets(userId: string) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Find all cabinet members for the user
    const cabinetMembers = await CabinetMember.findAll({
      where: {
        userId,
      },
      include: [{
        model: Cabinet,
        as: 'cabinet',
        where: {
          status: 'approved',
          isActive: true
        },
        attributes: ['id', 'name', 'description']
      },
      {
        model: CabinetMemberPermission,
        as: 'memberPermissions',
        attributes: ['role', 'permissions'],
        required: false,
        where: {
          userId,
        }
      }]
    });

    // Extract cabinets from cabinet members with role and permissions
    return cabinetMembers.map(member => {
      // Get the cabinet data using the association
      const cabinetData = (member as any).cabinet?.toJSON();
      return {
        ...cabinetData,
        role: (member as any).memberPermissions?.role,
        permissions: (member as any).memberPermissions?.permissions
      };
    });
  }

  static async getUserWithRelatedData(userId: string, includeParams: string[] = []) {
    // Get basic user data
    const user = await this.getUser(userId);
    
    // Initialize result object
    const result: any = {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatar: user.avatar,
        position: user.position,
      }
    };
    
    // Check if user is a super_user
    let isSuperUser = false;
    
    // First check organization_members table
    const organizations = await OrganizationService.findDomainByUserId(userId);
    result.organization = organizations;
    
    if (organizations && organizations.length > 0) {      
        const members = await OrganizationMemberService.getOrganizationMembers(organizations);
        const userMember = members.find(member => member.userId === userId);
        
        if (userMember && userMember.role === 'super_user') {
          isSuperUser = true;
        }
    }
    
    if (!isSuperUser) {
      const userRoles = await user.getRoles();
      const hasSuperUserRole = userRoles.some(role => 
        ['super_user', 'admin', 'system_admin'].includes(role.name)
      );
      
      if (hasSuperUserRole) {
        isSuperUser = true;
      }
    }
    
    result.isSuperUser = isSuperUser;
    
    if (includeParams.includes('organizations')) {
      result.organization = organizations;
    }
    
    if (includeParams.includes('groups')) {
      const groups = await GroupService.getGroupsByUserId(userId);
      result.groups = groups;
    }
    
    if (includeParams.includes('cabinets')) {
      const cabinets = await this.getUserCabinets(userId);
      result.cabinets = cabinets;
    }
    
    if (includeParams.includes('roles')) {
      const roles = await user.getRoles();
      result.roles = roles;
    }

    
    return result;
  }
}