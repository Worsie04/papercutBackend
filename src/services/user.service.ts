import { Op, Transaction } from 'sequelize';
import { User } from '../models/user.model';
import { Role } from '../models/role.model';
import { AppError } from '../presentation/middlewares/errorHandler';
import { JwtUtil } from '../utils/jwt.util';
import { sequelize } from '../infrastructure/database/sequelize';

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
    sortBy = 'createdAt',
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
      include: [{
        model: Role,
        as: 'roles',
        through: { attributes: [] } // Exclude junction table attributes
      }]
    });

    return {
      users: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    };
  }

  static async getUser(id: string): Promise<User> {
    const user = await User.findByPk(id, {
      include: [{
        model: Role,
        as: 'roles',
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
    }
  ): Promise<User> {
    const user = await User.findByPk(id, {
      include: [{
        model: Role,
        as: 'roles',
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
} 