import { Transaction } from 'sequelize';
import { Space, SpaceType } from '../models/space.model';
import { User } from '../models/user.model';
import { AppError } from '../presentation/middlewares/errorHandler';
import { sequelize } from '../infrastructure/database/sequelize';
import { uploadFile } from '../utils/upload.util';
import { SpaceInvitation } from '../models/spaceInvitation.model';
import { sendInvitationEmail } from '../utils/email.util';
import { SpaceMember } from '../models/space-member.model';
import { Cabinet } from '../models/cabinet.model';

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

interface InviteMembersParams {
  emails: string[];
  role: string;
  message?: string;
  inviterId: string;
}

interface InvitationResult {
  email: string;
  status: 'success' | 'error';
  message?: string;
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
          createdById: data.ownerId,
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

        // Create space members directly
        await Promise.all(
          users.map((user) =>
            SpaceMember.create(
              {
                spaceId: newSpace.id,
                userId: user.id,
                role: data.userGroup,
                permissions: [],
              },
              { transaction }
            )
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
          as: 'spaceMembers',
          through: { 
            attributes: ['role', 'permissions'] 
          },
        },
        {
          model: User,
          as: 'owner',
        },
        {
          model: User,
          as: 'createdBy',
        }
      ],
    });

    if (!space) {
      throw new AppError(404, 'Space not found');
    }

    // Transform the response to include role directly in member object
    const transformedSpace = space.toJSON();
    transformedSpace.members = transformedSpace.spaceMembers.map((member: any) => ({
      ...member,
      role: member.SpaceMember?.role || 'member'
    }));
    delete transformedSpace.spaceMembers;

    return transformedSpace;
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
          as: 'spaceMembers',
          through: { attributes: ['role', 'permissions'] },
        },
        {
          model: User,
          as: 'owner',
        },
        {
          model: User,
          as: 'createdBy',
        }
      ],
      order: [['createdAt', 'DESC']],
    });

    // Transform each space to maintain backward compatibility
    return spaces.map(space => {
      const transformedSpace = space.toJSON();
      transformedSpace.members = transformedSpace.spaceMembers.map((member: any) => ({
        ...member,
        role: member.SpaceMember?.role || 'member'
      }));
      delete transformedSpace.spaceMembers;
      return transformedSpace;
    });
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

  static async inviteMembers(
    spaceId: string, 
    { emails, role, message, inviterId }: InviteMembersParams
  ): Promise<InvitationResult[]> {
    const results: InvitationResult[] = [];
    const space = await Space.findByPk(spaceId);
    const inviter = await User.findByPk(inviterId);

    if (!space) {
      throw new AppError(404, 'Space not found');
    }

    if (!inviter) {
      throw new AppError(404, 'Inviter not found');
    }

    // Process each email
    for (const email of emails) {
      try {
        // Check if user already exists
        let user = await User.findOne({ where: { email } });

        if (user) {
          // Check if user is already a member
          const isMember = await SpaceMember.findOne({
            where: {
              spaceId,
              userId: user.id
            }
          });
          if (isMember) {
            results.push({
              email,
              status: 'error',
              message: 'User is already a member of this space'
            });
            continue;
          }

          // Add user as member
          await space.addMember(user, {
            through: {
              role,
              permissions: []
            }
          });

          results.push({
            email,
            status: 'success',
            message: 'User added as member'
          });
        } else {
          // Create invitation record
          await SpaceInvitation.create({
            spaceId,
            email,
            role,
            inviterId,
            status: 'pending',
            message
          });

          // Send invitation email
          await sendInvitationEmail({
            to: email,
            spaceName: space.name,
            inviterName: `${inviter.firstName} ${inviter.lastName}`,
            role,
            message,
            invitationLink: `${process.env.CLIENT_URL}/invitations/accept?space=${spaceId}&email=${encodeURIComponent(email)}`
          });

          results.push({
            email,
            status: 'success',
            message: 'Invitation sent'
          });
        }
      } catch (error) {
        console.error(`Error processing invitation for ${email}:`, error);
        results.push({
          email,
          status: 'error',
          message: 'Failed to process invitation'
        });
      }
    }

    return results;
  }

  static async updateMemberRole(spaceId: string, userId: string, role: string): Promise<void> {
    const spaceMember = await SpaceMember.findOne({
      where: {
        spaceId,
        userId
      }
    });

    if (!spaceMember) {
      throw new AppError(404, 'Member not found in this space');
    }

    await spaceMember.update({ role });
  }

} 