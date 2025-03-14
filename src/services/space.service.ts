import { Transaction, QueryTypes } from 'sequelize';
import { Space, SpaceType } from '../models/space.model';
import { User } from '../models/user.model';
import { AppError } from '../presentation/middlewares/errorHandler';
import { sequelize } from '../infrastructure/database/sequelize';
import { uploadFile } from '../utils/upload.util';
import { SpaceInvitation } from '../models/spaceInvitation.model';
import { sendInvitationEmail } from '../utils/email.util';
import { SpaceMember } from '../models/space-member.model';
import { Cabinet } from '../models/cabinet.model';
import { OrganizationMember } from '../models/organization-member.model';
import { SpaceCommentService } from './space-comment.service';
import { SpaceReassignment } from '../models/space-reassignment.model';
import { Record as RecordModel } from '../models/record.model';
import { NotificationService } from './notification.service';

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
  approvers?: Array<{userId: string, order: number}>;
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

  static async getSuperUsers() {
    try {
      // Find organization members with super_user role
      const organizationMembers = await OrganizationMember.findAll({
        where: { role: 'super_user' },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }]
      });

      // Transform the data to match the User interface
      const superUsers = organizationMembers.map(member => {
        const user = (member as any).user;
        return {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email
        };
      });

      return superUsers;
    } catch (error) {
      console.error('Error fetching super users:', error);
      throw error;
    }
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
          approvers: data.requireApproval && Array.isArray(data.approvers) ? data.approvers : [],
          description: data.description,
          type: SpaceType.CORPORATE,
          ownerId: data.ownerId,
          createdById: data.ownerId,
          settings: {
            userGroup: data.userGroup,
          },
          status: data.requireApproval ? 'pending' : 'approved',
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

    // Send notifications to approvers if approval is required
    if (data.requireApproval && Array.isArray(data.approvers) && data.approvers.length > 0) {
      try {
        // Get creator information for the notification
        const creator = await User.findByPk(data.ownerId);
        const creatorName = creator ? `${creator.firstName} ${creator.lastName}` : 'A user';
        
        // Send notification to each approver
        for (const approver of data.approvers) {
          await NotificationService.createSpaceCreationNotification(
            approver.userId,
            space.id,
            space.name,
            creatorName
          );
        }
      } catch (error) {
        console.error('Error sending space creation notifications:', error);
        // We don't want to fail the space creation if notifications fail
      }
    }

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
        },
        {
          model: User,
          as: 'rejector',
        },
      ],
    });

    if (!space) {
      throw new AppError(404, 'Space not found');
    }

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
      where: {
        status: 'approved'
      },
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

  static async getSpacesByStatus(status: string): Promise<Space[]> {
    const spaces = await Space.findAll({
      where: {
        status
      },
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
      const space = await Space.findByPk(spaceId, {
        include: [{
          model: User,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName']
        }]
      });
      
      if (!space) {
        throw new Error('Space not found');
      }

      await space.update({ status: 'approved' });
      
      // Send notification to the space owner
      if (space.owner) {
        try {
          await NotificationService.createSpaceApprovalNotification(
            space.owner.id,
            space.id,
            space.name
          );
          console.log(`Approval notification sent to space owner: ${space.owner.id}`);
        } catch (error) {
          console.error('Error sending space approval notification:', error);
          // We don't want to fail the space approval if the notification fails
        }
      }
      
      return space;
    } catch (error) {
      console.error('Error approving space:', error);
      throw error;
    }
  }

  static async rejectSpace(spaceId: string, reason: string, rejectedBy: string) {
    try {
      const space = await Space.findByPk(spaceId, {
        include: [{
          model: User,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName']
        }]
      });
      
      if (!space) {
        throw new Error('Space not found');
      }

      await space.update({ 
        status: 'rejected',
        rejectionReason: reason,
        rejectedBy
      });
      
      // Send notification to the space owner
      if (space.owner) {
        try {
          await NotificationService.createSpaceRejectionNotification(
            space.owner.id,
            space.id,
            space.name,
            reason
          );
          console.log(`Rejection notification sent to space owner: ${space.owner.id}`);
        } catch (error) {
          console.error('Error sending space rejection notification:', error);
          // We don't want to fail the space rejection if the notification fails
        }
      }
      
      return space;
    } catch (error) {
      console.error('Error rejecting space:', error);
      throw error;
    }
  }

  static async resubmitSpace(spaceId: string, message: string, userId: string) {
    try {
      const space = await Space.findByPk(spaceId, {
        include: [{
          model: User,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName']
        }]
      });
      
      if (!space) {
        throw new Error('Space not found');
      }

      // Change status back to pending
      await space.update({ 
        status: 'pending',
        rejectionReason: null,
        rejectedBy: null
      });
      
      // Add a comment about the resubmission
      await SpaceCommentService.createComment({
        spaceId,
        userId,
        message: message || 'Space resubmitted for approval.',
        type: 'update'
      });
      
      // Send notifications to approvers
      if (space.approvers && Array.isArray(space.approvers) && space.approvers.length > 0) {
        try {
          // Get submitter information for the notification
          const submitter = await User.findByPk(userId);
          const submitterName = submitter ? `${submitter.firstName} ${submitter.lastName}` : 'A user';
          
          // Send notification to each approver
          for (const approver of space.approvers) {
            await NotificationService.createSpaceCreationNotification(
              approver.userId,
              space.id,
              space.name,
              submitterName
            );
          }
          console.log(`Resubmission notifications sent to ${space.approvers.length} approvers`);
        } catch (error) {
          console.error('Error sending space resubmission notifications:', error);
          // We don't want to fail the space resubmission if notifications fail
        }
      }
      
      return space;
    } catch (error) {
      console.error('Error resubmitting space:', error);
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

  static async getMyPendingApprovals(userId: string) {
    try {
      console.log('Fetching spaces created by user that are pending approval:', userId);
      
      const pendingSpaces = await Space.findAll({
        where: {
          status: 'pending',
          requireApproval: true,
          createdById: userId
        },
        include: [{
          model: User,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName', 'avatar']
        }],
        order: [['createdAt', 'DESC']]
      });
      
      console.log('Found pending spaces created by this user:', pendingSpaces.length);
      
      return pendingSpaces.map((space: any) => ({
        id: space.id,
        name: space.name,
        status: space.status,
        createdAt: space.createdAt,
        updatedAt: space.updatedAt,
        owner: {
          firstName: space.owner?.firstName || 'Unknown',
          lastName: space.owner?.lastName || 'User',
          avatar: space.owner?.avatar || null
        }
      }));
    } catch (error) {
      console.error('Error fetching my pending space approvals:', error);
      throw error;
    }
  }

  static async getApprovalsWaitingFor(userId: string) {
    try {
      console.log('Fetching spaces waiting for approval by user:', userId);
      
      const pendingSpaces = await Space.findAll({
        where: {
          status: 'pending',
          requireApproval: true,
        },
        include: [{
          model: User,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName', 'avatar']
        }],
        order: [['createdAt', 'DESC']]
      });
      
      // Filter spaces where the current user is in the approvers list
      const spacesWaitingForApproval = pendingSpaces.filter(space => {
        if (!space.approvers) return false;
        
        // Check if the user is in the approvers array
        return space.approvers.some((approver: {userId: string, order: number}) => 
          approver.userId === userId
        );
      });
      
      console.log('Found spaces waiting for approval by this user:', spacesWaitingForApproval.length);
      
      return spacesWaitingForApproval.map((space: any) => {
        
        return {
          id: space.id,
          name: space.name,
          status: space.status,
          createdAt: space.createdAt,
          updatedAt: space.updatedAt,
          owner: space.owner ? {
            firstName: space.owner.firstName,
            lastName: space.owner.lastName,
            avatar: space.owner.avatar
          } : undefined
        };
      });
    } catch (error) {
      console.error('Error fetching spaces waiting for approval:', error);
      throw error;
    }
  }

  static async reassignApproval(
    spaceId: string, 
    currentUserId: string, 
    assigneeId: string, 
    message?: string
  ): Promise<void> {
    try {
      console.log(`Reassigning approval for space ${spaceId} from user ${currentUserId} to user ${assigneeId}`);
      
      // 1. Verify the space exists
      const space = await Space.findByPk(spaceId);
      if (!space) {
        throw new Error('Space not found');
      }
      
      // 2. Verify the space is in pending status
      if (space.status !== 'pending') {
        throw new Error('Only pending spaces can be reassigned');
      }
      
      // 3. Verify current user exists
      const currentUser = await User.findByPk(currentUserId);
      if (!currentUser) {
        throw new Error('Current user not found');
      }
      
      // 4. Get the current user's organization
      const userOrganizations = await OrganizationMember.findAll({
        where: {
          userId: currentUserId,
          status: 'active'
        }
      });
      
      if (!userOrganizations || userOrganizations.length === 0) {
        throw new Error('User is not a member of any organization');
      }
      
      const organizationIds = userOrganizations.map((org: any) => org.organizationId);
      
      // 5. Verify the assignee is a super user in the same organization
      const assigneeOrganizationMemberships = await OrganizationMember.findAll({
        where: {
          userId: assigneeId,
          organizationId: organizationIds,
          role: 'super_user',
          status: 'active'
        }
      });
      
      if (!assigneeOrganizationMemberships || assigneeOrganizationMemberships.length === 0) {
        throw new Error('Assignee is not a super user in your organization');
      }
      
      // Get the Sequelize transaction to ensure atomicity
      const transaction = await sequelize.transaction();
      
      try {
        // 6. Update the space's approvers array
        // Get current approvers array or initialize empty array if not present
        const currentApprovers = space.approvers || [];
        
        // Create new approvers array with the new assignee
        let updatedApprovers;
        
        if (Array.isArray(currentApprovers)) {
          // Replace the user with the new assignee while maintaining order
          updatedApprovers = currentApprovers.map(approver => {
            if (approver.userId === currentUserId) {
              return { ...approver, userId: assigneeId };
            }
            return approver;
          });
          
          // If the current user wasn't in the approvers list, add the assignee
          if (!currentApprovers.some(approver => approver.userId === currentUserId)) {
            updatedApprovers.push({ userId: assigneeId, order: currentApprovers.length + 1 });
          }
        } else {
          // If approvers isn't an array, create a new one with the assignee
          updatedApprovers = [{ userId: assigneeId, order: 1 }];
        }
        
        // Update the space with the new approvers array
        await space.update({ approvers: updatedApprovers }, { transaction });
        
        // 7. Create a record in the SpaceReassignment table to track history
        await SpaceReassignment.create({
          spaceId: spaceId,
          fromUserId: currentUserId,
          toUserId: assigneeId,
          message: message || 'Approval reassigned'
        }, { transaction });
        
        // Commit the transaction if all operations succeed
        await transaction.commit();
        
        // 8. Log the reassignment
        console.log(`Successfully reassigned approval for space ${spaceId} to user ${assigneeId}`);
        console.log(`Updated approvers:`, JSON.stringify(updatedApprovers, null, 2));
        
        // 9. Log space activity (simplified)
        console.log(`Activity logged for space ${spaceId}: reassign - Reassigned approval to another user`);
      } catch (error) {
        // Rollback the transaction if any operation fails
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error reassigning space approval:', error);
      throw error;
    }
  }

  static async getReassignmentHistory(spaceId: string): Promise<any[]> {
    try {
      const reassignments = await SpaceReassignment.findAll({
        where: { spaceId },
        include: [
          {
            model: User,
            as: 'fromUser',
            attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
          },
          {
            model: User,
            as: 'toUser',
            attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
          }
        ],
        order: [['createdAt', 'DESC']]
      });
      
      return reassignments.map(item => ({
        id: item.id,
        spaceId: item.spaceId,
        fromUser: item.fromUser,
        toUser: item.toUser,
        message: item.message,
        createdAt: item.createdAt
      }));
    } catch (error) {
      console.error('Error fetching space reassignment history:', error);
      throw error;
    }
  }

  static async getMySpacesByStatus(userId: string, status: string) {
    try {
      
      const spaces = await Space.findAll({
        where: {
          status,
          createdById: userId
        },
        include: [{
          model: User,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName', 'avatar']
        }],
        order: [['createdAt', 'DESC']]
      });
      
      console.log(`Found ${spaces.length} spaces with status ${status} created by this user`);
      
      
      if (spaces.length > 0) {
        console.log('First space example:', JSON.stringify(spaces[0], null, 2));
      }
      
      return spaces.map((space: any) => {
   
        const ownerData = space.owner ? {
          firstName: space.owner.firstName || 'Unknown',
          lastName: space.owner.lastName || 'User',
          avatar: space.owner.avatar || null
        } : {
          firstName: 'Unknown',
          lastName: 'User',
          avatar: null
        };
        
        return {
          id: space.id,
          name: space.name || 'Unnamed Space',
          status: space.status,
          createdAt: space.createdAt,
          updatedAt: space.updatedAt,
          owner: ownerData
        };
      });
    } catch (error) {
      console.error(`Error fetching spaces with status ${status}:`, error);
      throw error;
    }
  }

  static async deleteSpace(spaceId: string, userId: string): Promise<boolean> {
    try {
      console.log(`Attempting to delete space ${spaceId} by user ${userId}`);
      
      // 1. Verify the space exists
      const space = await Space.findByPk(spaceId, {
        include: [{
          model: User,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName']
        }]
      });
      
      if (!space) {
        throw new Error('Space not found');
      }
      
      const userOrganizations = await OrganizationMember.findAll({
        where: {
          userId,
          status: 'active',
          role: 'super_user'
        }
      });
      
      const isSuperUser = userOrganizations.length > 0;
      const isOwner = space.ownerId === userId;
      
      if (!isSuperUser && !isOwner) {
        throw new Error('You do not have permission to delete this space');
      }

      // Store space name for notifications before deletion
      const spaceName = space.name;
      const spaceOwnerId = space.ownerId;
      
      // 3. Delete all related records using a transaction
      const transaction = await sequelize.transaction();
      
      try {
        // Delete space members
        await SpaceMember.destroy({
          where: { spaceId },
          transaction
        });
        
        // Delete space reassignments using raw SQL to ensure correct column name
        await sequelize.query(
          `DELETE FROM space_reassignments WHERE "space_id" = :spaceId`,
          { 
            replacements: { spaceId },
            type: QueryTypes.DELETE,
            transaction
          }
        );
        
        // Delete space invitations
        await SpaceInvitation.destroy({
          where: { spaceId },
          transaction
        });
        
        // Delete space comments - using the correct table name space_comments_rejects
        await sequelize.query(
          `DELETE FROM space_comments_rejects WHERE "space_id" = :spaceId`,
          { 
            replacements: { spaceId },
            type: QueryTypes.DELETE,
            transaction
          }
        );
        
        // Delete any cabinets in the space
        const cabinets = await Cabinet.findAll({
          where: { spaceId },
          transaction
        });
        
        for (const cabinet of cabinets) {
          // Delete cabinet members
          await sequelize.query(
            `DELETE FROM cabinet_members WHERE "cabinet_id" = :cabinetId`,
            { 
              replacements: { cabinetId: cabinet.id },
              type: QueryTypes.DELETE,
              transaction
            }
          );
          
          // Delete cabinet followers
          await sequelize.query(
            `DELETE FROM cabinet_followers WHERE "cabinet_id" = :cabinetId`,
            { 
              replacements: { cabinetId: cabinet.id },
              type: QueryTypes.DELETE,
              transaction
            }
          );
          
          // Delete records in the cabinet
          const records = await RecordModel.findAll({
            where: { cabinetId: cabinet.id },
            transaction
          });
          
          for (const record of records) {
            // Delete record versions
            await sequelize.query(
              `DELETE FROM record_versions WHERE "record_id" = :recordId`,
              { 
                replacements: { recordId: record.id },
                type: QueryTypes.DELETE,
                transaction
              }
            );
            
            // Delete record notes/comments
            await sequelize.query(
              `DELETE FROM records_notes_comments WHERE "record_id" = :recordId`,
              { 
                replacements: { recordId: record.id },
                type: QueryTypes.DELETE,
                transaction
              }
            );
            
            // Delete the record itself
            await record.destroy({ transaction });
          }
          
          // Delete the cabinet
          await cabinet.destroy({ transaction });
        }
        
        // Finally, delete the space
        await space.destroy({ transaction });
        
        // Commit the transaction
        await transaction.commit();
        
        if (isSuperUser && !isOwner && spaceOwnerId !== userId) {
          try {
            await NotificationService.createSpaceDeletionNotification(
              space.id,
              spaceOwnerId,
              spaceName,
              userId
            );
            console.log(`Space deletion notification sent to space owner: ${spaceOwnerId}`);
          } catch (error) {
            console.error('Error sending space deletion notification:', error);
            
          }
        }
        
        console.log(`Successfully deleted space ${spaceId}`);
        return true;
      } catch (error) {
        // Rollback the transaction if any operation fails
        await transaction.rollback();
        console.error('Error during space deletion:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error deleting space:', error);
      throw error;
    }
  }
}