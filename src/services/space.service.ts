import { Transaction } from 'sequelize';
import { Space, SpaceType } from '../models/space.model';
import { User } from '../models/user.model';
import { AppError } from '../presentation/middlewares/errorHandler';
import { sequelize } from '../infrastructure/database/sequelize';
import { uploadFile } from '../utils/upload.util';

interface CreateSpaceParams {
  name: string;
  company?: string;
  tags: string[];
  users: string[];
  country: string;
  userGroup: string;
  description?: string;
  logo?: any;
  requireApproval: boolean;
  ownerId: string;
}

export class SpaceService {
  static async getAvailableUsers() {
    const users = await User.findAll({
      where: { isActive: true },
      attributes: ['id', 'firstName', 'lastName', 'email'],
    });
    return users;
  }

  static async createSpace(data: CreateSpaceParams): Promise<Space> {
    const existingSpace = await Space.findOne({
      where: { name: data.name },
    });

    if (existingSpace) {
      throw new AppError(400, 'Space with this name already exists');
    }

    // Upload logo if provided
    let logoUrl: string | undefined;
    if (data.logo) {
      logoUrl = await uploadFile(data.logo, 'spaces/logos');
    }

    // Create space and assign members in a transaction
    const space = await sequelize.transaction(async (transaction: Transaction) => {
      const newSpace = await Space.create(
        {
          name: data.name,
          company: data.company,
          tags: Array.isArray(data.tags) ? data.tags : [],
          country: data.country,
          logo: logoUrl,
          requireApproval: data.requireApproval,
          description: data.description,
          type: SpaceType.CORPORATE,
          ownerId: data.ownerId,
          settings: {
            userGroup: data.userGroup,
          },
        },
        { transaction }
      );

      // Add members to the space
      if (data.users.length > 0) {
        const users = await User.findAll({
          where: { id: data.users },
          transaction,
        });

        if (users.length !== data.users.length) {
          const foundUserIds = users.map(user => user.id);
          const missingUserIds = data.users.filter(id => !foundUserIds.includes(id));
          throw new AppError(400, `Users not found: ${missingUserIds.join(', ')}`);
        }

        await Promise.all(
          users.map((user) =>
            newSpace.addMember(user, {
              through: {
                role: data.userGroup,
                permissions: [],
              },
              transaction,
            })
          )
        );
      }

      return newSpace;
    });

    // Fetch the space with member information
    return this.getSpace(space.id);
  }

  static async getSpace(id: string): Promise<Space> {
    const space = await Space.findByPk(id, {
      include: [
        {
          model: User,
          as: 'members',
          through: { attributes: ['role', 'permissions'] },
        },
        {
          model: User,
          as: 'owner',
        },
      ],
    });

    if (!space) {
      throw new AppError(404, 'Space not found');
    }

    return space;
  }

  static async addMember(
    spaceId: string,
    userId: string,
    role: string = 'member'
  ): Promise<void> {
    const [space, user] = await Promise.all([
      Space.findByPk(spaceId),
      User.findByPk(userId),
    ]);

    if (!space) {
      throw new AppError(404, 'Space not found');
    }

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    await space.addMember(user, {
      through: {
        role,
        permissions: [],
      },
    });
  }

  static async removeMember(spaceId: string, userId: string): Promise<void> {
    const space = await Space.findByPk(spaceId);
    if (!space) {
      throw new AppError(404, 'Space not found');
    }

    const removed = await space.removeMember(userId);
    if (!removed) {
      throw new AppError(404, 'User is not a member of this space');
    }
  }

  static async getAllSpaces(): Promise<Space[]> {
    const spaces = await Space.findAll({
      include: [
        {
          model: User,
          as: 'members',
          through: { attributes: ['role', 'permissions'] },
        },
        {
          model: User,
          as: 'owner',
        },
      ],
      order: [['createdAt', 'DESC']],
    });
    return spaces;
  }

  static async getPendingApprovals(userId: string) {
    try {
      console.log('Fetching pending space approvals for user:', userId);
      const pendingSpaces = await Space.findAll({
        where: {
          status: 'pending'
        },
        include: [{
          model: User,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName', 'avatar']
        }],
        order: [['createdAt', 'DESC']]
      });

      console.log('Found pending spaces:', pendingSpaces.length);

      return pendingSpaces.map((space: any) => ({
        id: space.id,
        name: space.name,
        type: 'space',
        createdBy: {
          id: space.owner.id,
          name: `${space.owner.firstName} ${space.owner.lastName}`,
          avatar: space.owner.avatar || '/images/avatar.png'
        },
        createdAt: space.createdAt,
        priority: 'Med'
      }));
    } catch (error) {
      console.error('Error fetching pending space approvals:', error);
      throw error;
    }
  }

  static async approveSpace(spaceId: string) {
    try {
      const space = await Space.findByPk(spaceId);
      if (!space) {
        throw new Error('Space not found');
      }

      await space.update({ status: 'approved' });
      return space;
    } catch (error) {
      console.error('Error approving space:', error);
      throw error;
    }
  }

  static async rejectSpace(spaceId: string, reason: string) {
    try {
      const space = await Space.findByPk(spaceId);
      if (!space) {
        throw new Error('Space not found');
      }

      await space.update({ 
        status: 'rejected',
        rejectionReason: reason
      });
      return space;
    } catch (error) {
      console.error('Error rejecting space:', error);
      throw error;
    }
  }
} 