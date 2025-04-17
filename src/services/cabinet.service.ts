import { Cabinet, CustomField, CabinetApprover } from '../models/cabinet.model';
import { CabinetNoteComment } from '../models/cabinet-note-comment.model';
import { CabinetReassignment } from '../models/cabinet-reassignment.model';
import { AppError } from '../presentation/middlewares/errorHandler';
import { User } from '../models/user.model';
import { Space } from '../models/space.model';
import { sequelize } from '../infrastructure/database/sequelize';
import { CabinetMember } from '../models/cabinet-member.model';
import { CabinetMemberPermission } from '../models/cabinet-member-permission.model';
import { Op } from 'sequelize';
import { ActivityService } from './activity.service';
import { NotificationService } from './notification.service';
import { Activity, ActivityType, ResourceType } from '../models/activity.model';

interface CreateCabinetParams {
  name: string;
  company: string;
  description?: string;
  spaceId: string;
  parentId?: string;
  tags: string[];
  customFields: CustomField[];
  members: string[];
  approvers: CabinetApprover[];
  approverNote?: string;
  createdById: string;
}

interface CabinetWithAssociations {
  id: string;
  name: string;
  company: string;
  description?: string;
  spaceId: string;
  parentId?: string;
  tags: string[];
  metadata?: any;
  settings: any;
  customFields: CustomField[];
  memberIds: string[];
  approvers: CabinetApprover[];
  approverNote?: string;
  isActive: boolean;
  createdById: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
  creator?: User;
  associatedMembers?: User[];
  associatedApprovers?: User[];
}

export class CabinetService {
  static async createCabinet(data: CreateCabinetParams): Promise<Cabinet> {
    // Validate space exists
    const space = await Space.findByPk(data.spaceId);
    if (!space) {
      throw new AppError(404, 'Space not found');
    }
  
    // Validate parent cabinet if provided
    if (data.parentId) {
      const parentCabinet = await Cabinet.findByPk(data.parentId);
      if (!parentCabinet) {
        throw new AppError(404, 'Parent cabinet not found');
      }
    }
  
    // Ensure the creator is automatically added as a member
    if (!data.members.includes(data.createdById)) {
      data.members.push(data.createdById);
    }
  
    // Define default permissions for cabinet members
    const defaultPermissions = {
      readRecords: true,
      createRecords: false,
      updateRecords: false,
      deleteRecords: false,
      manageCabinet: false,
      downloadFiles: true,
      exportTables: false
    };
  
    // If the space does NOT require approval, auto-approve the cabinet.
    if (!space.requireApproval) {
      // Validate members exist if provided
      if (data.members && data.members.length > 0) {
        const users = await User.findAll({
          where: { id: data.members }
        });
        if (users.length !== data.members.length) {
          throw new AppError(400, 'One or more members not found');
        }
      }
      // Create cabinet with auto-approved status
      const cabinet = await Cabinet.create({
        ...data,
        status: 'approved',
        isActive: true,
        approvedBy: data.createdById,
        approvedAt: new Date()
      });
  
      // Log cabinet creation activity for auto-approved cabinet
      try {
        await ActivityService.logActivity({
          userId: data.createdById,
          action: ActivityType.CREATE,
          resourceType: ResourceType.CABINET,
          resourceId: cabinet.id,
          resourceName: cabinet.name,
          details: `Cabinet auto-approved in space ${space.name}`
        });
      } catch (error) {
        console.error('Failed to log cabinet creation activity:', error);
      }
  
      // Process members: assign selected users as cabinet members with default permissions
      if (data.members && data.members.length > 0) {
        const assignments = data.members.map((memberId: string) => ({
          userId: memberId,
          cabinetId: cabinet.id,
          role: 'member_full',
          permissions: defaultPermissions
        }));
  
        await CabinetService.assignUsersWithPermissions(assignments, data.spaceId);
      }
  
      return cabinet;
    }
  
    // For spaces that require approval, validate members if provided
    if (data.members && data.members.length > 0) {
      const users = await User.findAll({
        where: { id: data.members }
      });
      if (users.length !== data.members.length) {
        throw new AppError(400, 'One or more members not found');
      }
    }
  
    // Validate approvers exist (only required when approval is needed)
    if (data.approvers && data.approvers.length > 0) {
      const approverIds = data.approvers.map(a => a.userId);
      const users = await User.findAll({
        where: { id: approverIds }
      });
      if (users.length !== approverIds.length) {
        throw new AppError(400, 'One or more approvers not found');
      }
    }
  
    // Create cabinet with pending status
    const cabinet = await Cabinet.create({
      ...data,
      status: 'pending',
      isActive: true
    });
  
    // Log cabinet creation activity
    try {
      await ActivityService.logActivity({
        userId: data.createdById,
        action: ActivityType.CREATE,
        resourceType: ResourceType.CABINET,
        resourceId: cabinet.id,
        resourceName: cabinet.name,
        details: `Cabinet created in space ${space.name}`
      });
    } catch (error) {
      console.error('Failed to log cabinet creation activity:', error);
    }
  
    // Send notifications to approvers if needed
    if (data.approvers && data.approvers.length > 0) {
      try {
        const creator = await User.findByPk(data.createdById);
        const creatorName = creator ? `${creator.firstName} ${creator.lastName}` : 'A user';
        for (const approver of data.approvers) {
          await NotificationService.createCabinetCreationNotification(
            approver.userId,
            cabinet.id,
            cabinet.name,
            creatorName
          );
        }
      } catch (error) {
        console.error('Error sending cabinet creation notifications:', error);
      }
    }
  
    // Process members in pending branch
    if (data.members && data.members.length > 0) {
      const assignments = data.members.map((memberId: string) => ({
        userId: memberId,
        cabinetId: cabinet.id,
        role: 'member_full',
        permissions: defaultPermissions
      }));
  
      await CabinetService.assignUsersWithPermissions(assignments, data.spaceId);
    }
  
    return cabinet;
  }

  static async getCabinet(id: string): Promise<Cabinet> {
    const cabinet = await Cabinet.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'avatar']
        },
        {
          model: User,
          as: 'members',
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
        },
        {
          model: CabinetNoteComment,
          as: 'notesAndComments',
          required: false,
          include: [{
            model: User,
            as: 'creator',
            attributes: ['id', 'firstName', 'lastName', 'avatar']
          }]
        }
      ]
    });
    
    if (!cabinet) {
      throw new AppError(404, 'Cabinet not found');
    }
    
    return cabinet;
  }

  static async getCabinets(spaceId: string): Promise<Cabinet[]> {
    return Cabinet.findAll({
      where: { spaceId }
    });
  }

  static async getApprovedCabinets(spaceId: string): Promise<Cabinet[]> {
    return Cabinet.findAll({
      where: { 
        spaceId,
        status: 'approved',
        isActive: true
      }
    });
  }

  static async getPendingApprovals(userId: string) {
    try {
     // console.log('Fetching pending cabinet approvals for user:', userId);
      const pendingCabinets = await Cabinet.findAll({
        where: {
          status: 'pending'
        },
        include: [{
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'avatar']
        }],
        order: [['createdAt', 'DESC']]
      });

      return pendingCabinets.map(cabinet => {
        const cabinetData = cabinet.get({ plain: true }) as CabinetWithAssociations;
        return {
          id: cabinetData.id,
          name: cabinetData.name,
          type: 'cabinet',
          createdBy: cabinetData.creator ? {
            id: cabinetData.creator.id,
            name: `${cabinetData.creator.firstName} ${cabinetData.creator.lastName}`,
            avatar: cabinetData.creator.avatar || '/images/avatar.png'
          } : {
            id: 'unknown',
            name: 'Unknown User',
            avatar: '/images/avatar.png'
          },
          createdAt: cabinetData.createdAt,
          priority: 'Med'
        };
      });
    } catch (error) {
      console.error('Error fetching pending cabinet approvals:', error);
      throw error;
    }
  }

  static async getMyPendingApprovals(userId: string, status: string) {
    try {
      const pendingCabinets = await Cabinet.findAll({
        where: {
          status,
          createdById: userId
        },
        include: [{
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'avatar']
        }],
        order: [['createdAt', 'DESC']]
      });
      
      return pendingCabinets.map(cabinet => {
        const cabinetData = cabinet.get({ plain: true }) as CabinetWithAssociations;
        return {
          id: cabinetData.id,
          name: cabinetData.name,
          type: 'cabinet',
          createdBy: cabinetData.creator ? {
            id: cabinetData.creator.id,
            name: `${cabinetData.creator.firstName} ${cabinetData.creator.lastName}`,
            avatar: cabinetData.creator.avatar || '/images/avatar.png'
          } : {
            id: 'unknown',
            name: 'Unknown User',
            avatar: '/images/avatar.png'
          },
          createdAt: cabinetData.createdAt,
          priority: 'Med',
          status: cabinetData.status,
          rejectionReason: cabinetData.rejectionReason || undefined
        };
      });
    } catch (error) {
      console.error('Error fetching my pending cabinet approvals:', error);
      throw error;
    }
  }

  static async getApprovalsWaitingFor(userId: string) {
    try {
      // 1. İlk öncə reassignment olan cabinetləri axtarırıq
      const reassignedCabinets = await Cabinet.findAll({
        where: {
          status: 'pending'
        },
        include: [{
          model: CabinetReassignment, // Əgər Cabinet modelində association "reassignments" kimi təyin edilibsə
          as: 'reassignments',
          required: true,
          where: {
            toUserId: userId
          }
        }],
        order: [['createdAt', 'DESC']]
      });
  
      // 2. Reassignment qeydi olmayan və approvers JSONB massivində userId olan cabinetləri axtarırıq
      const pendingCabinets = await Cabinet.findAll({
        where: {
          status: 'pending',
          [Op.and]: [
            // Bu cabinet üçün reassignment qeydi olmamalıdır
            sequelize.literal(`NOT EXISTS (
              SELECT 1 FROM cabinet_reassignments AS cr 
              WHERE cr.cabinet_id = "Cabinet".id
            )`),
            // Approvers massivində userId axtarılır
            sequelize.literal(`EXISTS (
              SELECT 1 FROM jsonb_array_elements("approvers") AS approver
              WHERE approver->>'userId' = '${userId}'
            )`)
          ]
        },
        order: [['createdAt', 'DESC']]
      });
  
      // Hər iki nəticəni birləşdiririk
      const combinedCabinets = [...reassignedCabinets, ...pendingCabinets];
  
      // Nəticələri lazımi formata salırıq
      const cabinetPromises = combinedCabinets.map(async (cabinet: any) => {
        const createdBy = await User.findByPk(cabinet.createdById, {
          attributes: ['id', 'firstName', 'lastName', 'avatar']
        });
  
        return {
          id: cabinet.id,
          name: cabinet.name,
          type: 'cabinet',
          createdBy: createdBy ? {
            id: createdBy.id,
            name: `${createdBy.firstName} ${createdBy.lastName}`,
            avatar: createdBy.avatar || '/images/avatar.png'
          } : {
            id: 'unknown',
            name: 'Unknown User',
            avatar: '/images/avatar.png'
          },
          createdAt: cabinet.createdAt,
          priority: 'Med'
        };
      });
  
      return Promise.all(cabinetPromises);
    } catch (error) {
      console.error('Error fetching cabinets waiting for approval:', error);
      throw error;
    }
  }

  static async updateCabinet(id: string, updatedData: Partial<any>, userId: string) {
    // Cabinet-i tapırıq
    const cabinet = await Cabinet.findByPk(id);
    if (!cabinet) {
      throw new AppError(404, 'Cabinet not found');
    }
    if (cabinet.createdById !== userId) {
      throw new AppError(403, 'User is not authorized to update this cabinet');
    }
  
    // Kabinetin əsas məlumatlarını update edirik
    await cabinet.update(updatedData);
  
    // Əgər updatedData.comments varsa, comment qeydini yaradırıq
    if (updatedData.comments && updatedData.comments.trim() !== '') {
      await CabinetNoteComment.create({
        cabinetId: id,
        content: updatedData.comments,
        type: 'comment',
        action: 'update',
        createdBy: userId
      });
    }
  
    // Əgər updatedData.note varsa, note qeydini yaradırıq
    if (updatedData.note && updatedData.note.trim() !== '') {
      await CabinetNoteComment.create({
        cabinetId: id,
        content: updatedData.note,
        type: 'note',
        action: 'update',
        createdBy: userId
      });
    }
  
    // Sonuncu reassign edilmiş super useri tapırıq
    const latestReassignment = await CabinetReassignment.findOne({
      where: { cabinetId: id },
      order: [['createdAt', 'DESC']]
    });
  
    let targetApproverId: string | null = null;
    if (latestReassignment) {
      targetApproverId = latestReassignment.toUserId;
    } else {
      // Əgər reassign olunmayıbsa, kabinetdəki approversdən istifadə edirik
      const cabinetData = cabinet.get({ plain: true });
      if (cabinetData.approvers && cabinetData.approvers.length > 0) {
        targetApproverId = cabinetData.approvers[0].userId;
      }
    }
  
    // Əgər təsdiq üçün hədəf approver müəyyən edilibsə, activity log və notification göndəririk
    if (targetApproverId) {
      try {
        await ActivityService.logActivity({
          userId,
          action: ActivityType.UPDATE, // Yaxud xüsusi bir action: "update_and_resubmit"
          resourceType: ResourceType.CABINET,
          resourceId: id,
          resourceName: cabinet.name,
          details: 'Cabinet updated and resubmitted for approval'
        });
      } catch (error) {
        console.error('Failed to log cabinet update activity:', error);
      }
      try {
        await NotificationService.createCabinetResubmittedlNotification(
          targetApproverId,
          id,
          cabinet.name
        );
      } catch (error) {
        console.error('Error sending update approval notification:', error);
      }
    }
  
    return cabinet;
  }
 
  static async approveCabinet(
    id: string,
    userId: string,
    note?: string,
    updatedData?: Partial<any>,
    comments?: string
  ) {
    const transaction = await sequelize.transaction();
    try {
      const cabinet = await Cabinet.findByPk(id, {
        include: [{
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName']
        }],
        transaction
      });
      if (!cabinet) {
        throw new AppError(404, 'Cabinet not found');
      }
      if (updatedData && Object.keys(updatedData).length > 0) {
        await cabinet.update(updatedData, { transaction });
      }
      const cabinetData = cabinet.get({ plain: true });
      // Əvvəlcə cabinet.approvers arrayində istifadəçini axtarırıq
      const isApproverInCabinet = cabinetData.approvers?.some(
        (approver: any) => approver.userId === userId
      );
      // Əgər tapılmırsa, cabinets_reassignments cədvəlində yoxlayırıq
      if (!isApproverInCabinet) {
        const reassignment = await CabinetReassignment.findOne({
          where: { cabinetId: id, toUserId: userId }
        });
        if (!reassignment) {
          throw new AppError(403, 'User is not authorized to approve this cabinet');
        }
      }
      if (cabinetData.status === 'approved') {
        throw new AppError(400, 'Cabinet is already approved');
      }
      await cabinet.update({
        status: 'approved',
        approvedBy: userId,
        approvedAt: new Date()
      }, { transaction });
      await CabinetNoteComment.create({
        cabinetId: id,
        content: note || 'Cabinet approved',
        type: 'system',
        action: 'approve',
        createdBy: userId
      }, { transaction });
      if (comments) {
        await CabinetNoteComment.create({
          cabinetId: id,
          content: comments,
          type: 'comment',
          action: 'approve',
          createdBy: userId
        }, { transaction });
      }
      try {
        await ActivityService.logActivity({
          userId,
          action: ActivityType.APPROVE,
          resourceType: ResourceType.CABINET,
          resourceId: id,
          resourceName: cabinetData.name,
          details: 'Cabinet approved'
        });
      } catch (error) {
        console.error('Failed to log cabinet approval activity:', error);
      }
      if (cabinetData.creator) {
        try {
          await NotificationService.createCabinetApprovalNotification(
            cabinetData.creator.id,
            id,
            cabinetData.name
          );
        } catch (error) {
          console.error('Error sending cabinet approval notification:', error);
        }
      }
      await transaction.commit();
      return cabinet;
    } catch (error) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
      }
      throw error;
    }
  }

  static async rejectCabinet(
    id: string,
    userId: string,
    reason: string,
    note?: string,
    comments?: string,
    updatedData?: Partial<any>
  ) {
    const transaction = await sequelize.transaction();
    try {
      const cabinet = await Cabinet.findByPk(id, {
        include: [{
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName']
        }],
        transaction
      });
      if (!cabinet) {
        throw new AppError(404, 'Cabinet not found');
      }
      if (updatedData && Object.keys(updatedData).length > 0) {
        await cabinet.update(updatedData, { transaction });
      }
      const cabinetData = cabinet.get({ plain: true });
      // İlk növbədə cabinet.approvers arrayində yoxlayırıq
      const isApproverInCabinet = cabinetData.approvers?.some(
        (approver: any) => approver.userId === userId
      );
      // Tapılmadıqda, cabinet_reassignments cədvəlində axtarırıq
      if (!isApproverInCabinet) {
        const reassignment = await CabinetReassignment.findOne({
          where: { cabinetId: id, toUserId: userId }
        });
        if (!reassignment) {
          throw new AppError(403, 'User is not authorized to reject this cabinet');
        }
      }
      if (cabinetData.status === 'approved' || cabinetData.status === 'rejected') {
        throw new AppError(400, `Cabinet is already ${cabinetData.status}`);
      }
      await cabinet.update({
        status: 'rejected',
        rejectedBy: userId,
        rejectedAt: new Date(),
        rejectionReason: reason
      }, { transaction });
      if (note) {
        await CabinetNoteComment.create({
          cabinetId: id,
          content: note,
          type: 'note',
          action: 'reject',
          createdBy: userId
        }, { transaction });
      }
      if (comments) {
        await CabinetNoteComment.create({
          cabinetId: id,
          content: comments,
          type: 'comment',
          action: 'reject',
          createdBy: userId
        }, { transaction });
      }
      try {
        await ActivityService.logActivity({
          userId,
          action: ActivityType.REJECT,
          resourceType: ResourceType.CABINET,
          resourceId: id,
          resourceName: cabinetData.name,
          details: reason || 'Cabinet rejected'
        });
      } catch (error) {
        console.error('Failed to log cabinet rejection activity:', error);
      }
      if (cabinetData.creator) {
        try {
          await NotificationService.createCabinetRejectionNotification(
            cabinetData.creator.id,
            id,
            cabinetData.name,
            reason
          );
        } catch (error) {
          console.error('Error sending cabinet rejection notification:', error);
        }
      }
      await transaction.commit();
      return cabinet;
    } catch (error) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
      }
      throw error;
    }
  }
  static async reassignCabinet(
    id: string,
    userId: string,
    newApproverId: string,
    note?: string
  ) {
    const transaction = await sequelize.transaction();
    try {
      // creator əlaqəsini əlavə edirik ki, cabinetData.creator mövcud olsun
      const cabinet = await Cabinet.findByPk(id, {
        include: [{
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'avatar']
        }],
        transaction
      });
      if (!cabinet) {
        throw new AppError(404, 'Cabinet not found');
      }
      const cabinetData = cabinet.get({ plain: true });
      // Authorization: əvvəlcə cabinet.approvers yoxlanılır, əgər tapılmırsa, reassignment cədvəlindən yoxlanılır
      const isApproverInCabinet = cabinetData.approvers?.some(
        (a: any) => a.userId === userId
      );
      if (!isApproverInCabinet) {
        const reassignment = await CabinetReassignment.findOne({
          where: { cabinetId: id, toUserId: userId }
        });
        if (!reassignment) {
          throw new AppError(403, 'User is not authorized to reassign this cabinet');
        }
      }
      // Biznes loqikasına görə reassign: mövcud approvers siyahısında ilk elementi yeni approver ilə əvəz edirik
      let approvers = cabinetData.approvers || [];
      if (approvers.length > 0) {
        approvers[0].userId = newApproverId;
      } else {
        approvers.push({ userId: newApproverId, order: 1 });
      }
      await cabinet.update({ approvers }, { transaction });
    
      // Cabinet reassignment cədvəlində qeydiyyat əlavə edirik
      await CabinetReassignment.create(
        {
          cabinetId: id,
          fromUserId: userId,
          toUserId: newApproverId,
          message: note || 'Cabinet reassigned'
        },
        { transaction }
      );
    
      // Reassign qeydini əlavə edirik (CabinetNoteComment modelindən istifadə edərək)
      await CabinetNoteComment.create(
        {
          cabinetId: id,
          content: note || 'Cabinet reassigned',
          type: 'system',
          action: 'reassign',
          createdBy: userId
        },
        { transaction }
      );
    
      // Activity log
      try {
        await ActivityService.logActivity({
          userId,
          action: ActivityType.REASSIGN,
          resourceType: ResourceType.CABINET,
          resourceId: id,
          resourceName: cabinetData.name,
          details: `Cabinet reassigned to ${newApproverId}`
        });
      } catch (error) {
        console.error('Failed to log cabinet reassign activity:', error);
      }
    
      // Notification – yeni approver-ə bildiriş göndəririk
      try {
        await NotificationService.createCabinetReassignmentNotification(
          newApproverId,
          id,
          cabinetData.name
        );
      } catch (error) {
        console.error('Error sending cabinet reassignment notification:', error);
      }
    
      await transaction.commit();
      return cabinet;
    } catch (error) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
      }
      throw error;
    }
  }
 


  static async assignCabinetsToUsers(userIds: string[], cabinetIds: string[], spaceId: string) {
    // Verify that all cabinets exist and belong to the specified space
    const cabinets = await Cabinet.findAll({
      where: {
        id: cabinetIds,
        spaceId: spaceId,
        status: 'approved' // Only allow assigning approved cabinets
      }
    });

    if (cabinets.length !== cabinetIds.length) {
      throw new AppError(404, 'One or more cabinets not found or not approved in the specified space');
    }

    // Verify that all users exist and have access to the space
    // const spaceMembers = await SpaceMember.findAll({
    //   where: {
    //     userId: userIds,
    //     spaceId: spaceId
    //   }
    // });

    // if (spaceMembers.length !== userIds.length) {
    //   throw new AppError(404, 'One or more users not found in the specified space');
    // }

    // Create cabinet member records in a transaction
    await sequelize.transaction(async (transaction) => {
      const assignments = [];
      for (const userId of userIds) {
        for (const cabinetId of cabinetIds) {
          assignments.push({
            userId,
            cabinetId,
            role: 'member_full', // Default role for assigned users
            status: 'active'
          });
        }
      }

      // Bulk create cabinet member records
      await CabinetMember.bulkCreate(assignments, {
        transaction,
        ignoreDuplicates: true // Skip if the assignment already exists
      });
      
      // Log cabinet assignment activities
      try {
        for (const cabinet of cabinets) {
          for (const userId of userIds) {
            await ActivityService.logActivity({
              userId,
              action: ActivityType.REASSIGN,
              resourceType: ResourceType.CABINET,
              resourceId: cabinet.id,
              resourceName: cabinet.name,
              details: 'User assigned to cabinet'
            });
          }
        }
      } catch (error) {
        console.error('Failed to log cabinet assignment activity:', error);
      }
    });
  }

  static async assignUsersWithPermissions(assignments: {
    userId: string;
    cabinetId: string;
    role: string;
    permissions: {
      readRecords: boolean;
      createRecords: boolean;
      updateRecords: boolean;
      deleteRecords: boolean;
      manageCabinet: boolean;
      downloadFiles: boolean;
      exportTables: boolean;
    };
  }[], spaceId: string) {
    const transaction = await sequelize.transaction();
  
    try {
      // Validate that all cabinets belong to the specified space
      const cabinetIds = [...new Set(assignments.map(a => a.cabinetId))];
      const cabinets = await Cabinet.findAll({
        where: {
          id: cabinetIds,
          spaceId
        }
      });
  
      if (cabinets.length !== cabinetIds.length) {
        throw new AppError(400, 'Some cabinets do not belong to the specified space');
      }
  
      // Remove existing permissions for these user-cabinet combinations
      await CabinetMemberPermission.destroy({
        where: {
          [Op.or]: assignments.map(a => ({
            userId: a.userId,
            cabinetId: a.cabinetId
          }))
        },
        transaction
      });
  
      // Remove existing cabinet member records
      await CabinetMember.destroy({
        where: {
          [Op.or]: assignments.map(a => ({
            userId: a.userId,
            cabinetId: a.cabinetId
          }))
        },
        transaction
      });
  
      // 1. Create new cabinet member records and retrieve them (with returning: true)
      const createdMembers = await CabinetMember.bulkCreate(
        assignments.map(assignment => ({
          userId: assignment.userId,
          cabinetId: assignment.cabinetId,
          role: assignment.role,
          status: 'active'
        })),
        { transaction, returning: true }
      );
  
      // 2. Create new permission records by linking them to the corresponding cabinet member id
      const permissionRecords = assignments.map(assignment => {
        const matchingMember = createdMembers.find(
          m => m.userId === assignment.userId && m.cabinetId === assignment.cabinetId
        );
        if (!matchingMember) {
          throw new AppError(400, 'Cabinet member record not found for assignment');
        }
        return {
          userId: assignment.userId,
          cabinetId: assignment.cabinetId,
          role: assignment.role,
          permissions: assignment.permissions,
          cabinet_member_id: matchingMember.id
        };
      });
  
      await CabinetMemberPermission.bulkCreate(permissionRecords, { transaction });
  
      // Log cabinet permissions assignments
      try {
        const cabinetMap = new Map(cabinets.map(cabinet => [cabinet.id, cabinet]));
        for (const assignment of assignments) {
          const cabinet = cabinetMap.get(assignment.cabinetId);
          if (cabinet) {
            await ActivityService.logActivity({
              userId: assignment.userId,
              action: ActivityType.UPDATE_PERMISSIONS,
              resourceType: ResourceType.CABINET,
              resourceId: assignment.cabinetId,
              resourceName: cabinet.name,
              details: `Cabinet permissions updated to role: ${assignment.role}`
            });
          }
        }
      } catch (error) {
        console.error('Failed to log cabinet permissions activity:', error);
      }
  
      await transaction.commit();
      return true;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
  
  static async deleteCabinet(id: string, userId: string): Promise<boolean> {
    try {
      // 1. Verify the cabinet exists
      const cabinet = await Cabinet.findByPk(id);
      
      if (!cabinet) {
        throw new Error('Cabinet not found');
      }

      // Store cabinet name for logging before deletion
      const cabinetName = cabinet.name;
      
      // 2. Delete the cabinet and related records using a transaction
      const transaction = await sequelize.transaction();
      
      try {
        // Delete cabinet members
        await CabinetMember.destroy({
          where: { cabinetId: id },
          transaction
        });

        // Delete cabinet member permissions
        await CabinetMemberPermission.destroy({
          where: { cabinetId: id },
          transaction
        });

        // Delete cabinet (will cascade to other records as defined in your models)
        await cabinet.destroy({ transaction });
        
        // Commit the transaction
        await transaction.commit();
        
        // Log cabinet deletion activity after successful deletion
        try {
          await ActivityService.logActivity({
            userId,
            action: ActivityType.DELETE,
            resourceType: ResourceType.CABINET,
            resourceId: id,
            resourceName: cabinetName,
            details: 'Cabinet deleted'
          });
        } catch (error) {
          console.error('Failed to log cabinet deletion activity:', error);
        }
        
        return true;
      } catch (error) {
        // Rollback the transaction if any operation fails
        await transaction.rollback();
        console.error('Error during cabinet deletion:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error deleting cabinet:', error);
      throw error;
    }
  }
}