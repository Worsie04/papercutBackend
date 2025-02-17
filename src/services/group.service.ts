import { Group } from '../models/group.model';
import { User } from '../models/user.model';
import { sequelize } from '../infrastructure/database/sequelize';
import { Transaction } from 'sequelize';
import { AppError } from '../presentation/middlewares/errorHandler';

interface CreateGroupParams {
  name: string;
  description?: string;
  organizationId: string;
  createdBy: string;
}

export class GroupService {
  static async createGroup(data: CreateGroupParams): Promise<Group> {
    // Validate organization exists
    const existingGroup = await Group.findOne({
      where: { 
        name: data.name,
        organizationId: data.organizationId
      }
    });

    if (existingGroup) {
      throw new AppError(400, 'A group with this name already exists in the organization');
    }

    const group = await Group.create({
      ...data,
      isActive: true,
      membersCount: 0
    } as any);

    return group;
  }

  static async getGroups(organizationId: string): Promise<Group[]> {
    return await Group.findAll({
      where: { organizationId },
      include: [
        {
          model: User,
          as: 'members',
          through: { attributes: [] },
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
    });
  }

  static async getGroupsByUserId(userId: string): Promise<Group[]> {
    return await Group.findAll({
      include: [
        {
          model: User,
          as: 'members',
          through: { attributes: [] },
          attributes: ['id', 'firstName', 'lastName', 'email'],
          where: { id: userId },
          required: true,
        },
      ],
    });
  }

  static async getGroupById(id: string) {
    const group = await Group.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
        {
          model: User,
          as: 'members',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          through: { attributes: [] },
        },
      ],
    });

    if (!group) {
      throw new AppError(404, 'Group not found');
    }

    return group;
  }

  static async updateGroup(id: string, data: {
    name?: string;
    description?: string;
  }) {
    const group = await Group.findByPk(id);
    
    if (!group) {
      throw new AppError(404, 'Group not found');
    }

    return await group.update(data);
  }

  static async deleteGroup(id: string) {
    const group = await Group.findByPk(id);
    
    if (!group) {
      throw new AppError(404, 'Group not found');
    }

    await group.destroy();
  }

  static async addUsersToGroup(groupId: string, userIds: string[], addedBy: string) {
    const t: Transaction = await sequelize.transaction();

    try {
      const group = await Group.findByPk(groupId);
      if (!group) {
        throw new AppError(404, 'Group not found');
      }

      // Verify that all users exist
      const users = await User.findAll({
        where: { id: userIds }
      });

      if (users.length !== userIds.length) {
        throw new AppError(400, 'One or more users not found');
      }

      // Get existing members
      const existingMembers = await sequelize.query(
        'SELECT "user_id" FROM group_members WHERE "group_id" = ?',
        {
          replacements: [groupId],
          type: 'SELECT',
          transaction: t
        }
      );

      const existingMemberIds = existingMembers.map((m: any) => m.userId);
      const newUserIds = userIds.filter(id => !existingMemberIds.includes(id));

      if (newUserIds.length > 0) {
        // Add new members
        await sequelize.query(
          'INSERT INTO group_members (id, "group_id", "user_id", "added_by", "created_at", "updated_at") VALUES ' +
          newUserIds.map(() => '(uuid_generate_v4(), ?, ?, ?, NOW(), NOW())').join(', '),
          {
            replacements: newUserIds.flatMap(userId => [groupId, userId, addedBy]),
            type: 'INSERT',
            transaction: t
          }
        );

        // Update members count
        await group.update(
          { membersCount: (existingMemberIds.length + newUserIds.length) },
          { transaction: t }
        );
      }

      await t.commit();
      
      return await Group.findByPk(groupId, {
        include: [
          {
            model: User,
            as: 'members',
            attributes: ['id', 'firstName', 'lastName', 'email'],
            through: { attributes: [] }
          }
        ]
      });
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  static async removeUsersFromGroup(groupId: string, userIds: string[]) {
    const t: Transaction = await sequelize.transaction();

    try {
      const group = await Group.findByPk(groupId);
      if (!group) {
        throw new AppError(404, 'Group not found');
      }

      // Remove members
      await group.$remove('members', userIds, { transaction: t });

      // Update members count
      await group.decrement('membersCount', {
        by: userIds.length,
        transaction: t
      });

      await t.commit();
      return await this.getGroupById(groupId);
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
} 