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
      // include: [{
      //   model: Role,
      //   as: 'Roles',
      //   through: { attributes: [] }
      // }],
      // raw: false // Ensure we get Sequelize model instances
    });

    // Transform the users to plain objects
    // const users = rows.map(user => user.get({ plain: true }));

    return {
      users: rows, // This will now be a plain array of user objects
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    };
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

    // If password is being set (during magic link flow), try to add user to organization
    if (data.password) {
      try {
        // Extract domain from email
        const emailDomain = user.email.split('@')[1];
        
        // Find organization by domain
        const organization = await Organization.findOne({
          where: { domain: emailDomain }
        });

        if (organization) {
          // Get user's role (assuming first role is the default one)
          const userRoles = await user.getRoles();
          const defaultRole = userRoles[0]?.name || 'member_full'; // Default to member_full if no role found

          // Add user to organization
          await OrganizationMemberService.addMember(organization.id, {
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: defaultRole,
          });
        }
      } catch (error) {
        // Log error but don't fail the password update
        console.error('Error adding user to organization:', error);
      }
    }

    // Fetch updated user with role information
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
    return cabinetMembers.map(member => ({
      ...member.cabinet?.toJSON(),
      role: member.memberPermissions?.role,
      permissions: member.memberPermissions?.permissions
    }));
  }
}