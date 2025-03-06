import { Cabinet, CustomField, CabinetApprover } from '../models/cabinet.model';
import { AppError } from '../presentation/middlewares/errorHandler';
import { User } from '../models/user.model';
import { Space } from '../models/space.model';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../infrastructure/database/sequelize';
import { Transaction } from 'sequelize';
import { SpaceMember } from '../models/space-member.model';
import { CabinetMember } from '../models/cabinet-member.model';
import { CabinetMemberPermission } from '../models/cabinet-member-permission.model';
import { Op } from 'sequelize';

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

    // Validate members exist
    if (data.members.length > 0) {
      const users = await User.findAll({
        where: { id: data.members }
      });
      if (users.length !== data.members.length) {
        throw new AppError(400, 'One or more members not found');
      }
    }

    // Validate approvers exist
    if (data.approvers.length > 0) {
      const approverIds = data.approvers.map(a => a.userId);
      const users = await User.findAll({
        where: { id: approverIds }
      });
      if (users.length !== approverIds.length) {
        throw new AppError(400, 'One or more approvers not found');
      }
    }

    // Create cabinet
    const cabinet = await Cabinet.create({
      ...data,
      status: 'pending',
      isActive: true
    });

    return cabinet;
  }

  static async getCabinet(id: string): Promise<Cabinet> {
    const cabinet = await Cabinet.findByPk(id, {
      include: [
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'firstName', 'lastName', 'avatar']
        }
      ]
    });
    
    if (!cabinet) {
      throw new AppError(404, 'Cabinet not found');
    }
    
    // Transform the data to match the expected format
    const cabinetData = cabinet.toJSON();
    if (cabinetData.createdBy) {
      cabinetData.createdBy = {
        id: cabinetData.createdBy.id,
        name: `${cabinetData.createdBy.firstName} ${cabinetData.createdBy.lastName}`,
        avatar: cabinetData.createdBy.avatar || '/images/avatar.png'
      };
    }
    
    return cabinetData;
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
      console.log('Fetching pending cabinet approvals for user:', userId);
      const pendingCabinets = await Cabinet.findAll({
        where: {
          status: 'pending'
        },
        order: [['createdAt', 'DESC']]
      });

      console.log('Found pending cabinets:', pendingCabinets.length);

      const cabinetPromises = pendingCabinets.map(async (cabinet: any) => {
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
      console.error('Error fetching pending cabinet approvals:', error);
      throw error;
    }
  }

  static async getMyPendingApprovals(userId: string) {
    try {
      console.log('Fetching my pending cabinet approvals for user:', userId);
      const pendingCabinets = await Cabinet.findAll({
        where: {
          status: 'pending',
          createdById: userId  // Only get cabinets created by this user
        },
        order: [['createdAt', 'DESC']]
      });
      
      console.log('Found my pending cabinets:', pendingCabinets.length);
      
      const cabinetPromises = pendingCabinets.map(async (cabinet: any) => {
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
      console.error('Error fetching my pending cabinet approvals:', error);
      throw error;
    }
  }

  static async getApprovalsWaitingFor(userId: string) {
    try {
      console.log('Fetching cabinets waiting for approval by user:', userId);
      
      // Find cabinets where this user is listed as an approver
      const pendingCabinets = await Cabinet.findAll({
        where: {
          status: 'pending',
          // Using a raw query via sequelize.literal to search in the JSONB array
          [Op.and]: [
            sequelize.literal(`EXISTS(
              SELECT 1 FROM jsonb_array_elements("approvers") AS approver
              WHERE approver->>'userId' = '${userId}'
            )`)
          ]
        },
        order: [['createdAt', 'DESC']]
      });
      
      console.log('Found cabinets waiting for approval:', pendingCabinets.length);
      
      const cabinetPromises = pendingCabinets.map(async (cabinet: any) => {
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

  static async approveCabinet(id: string, userId: string) {
    const cabinet = await Cabinet.findByPk(id);
    
    if (!cabinet) {
      throw new AppError(404, 'Cabinet not found');
    }

    // Check if user is an approver
    if (!cabinet.approvers.some(approver => approver.userId === userId)) {
      throw new AppError(403, 'User is not authorized to approve this cabinet');
    }

    // Check if cabinet is already approved
    if (cabinet.status === 'approved') {
      throw new AppError(400, 'Cabinet is already approved');
    }

    // Update cabinet status
    await cabinet.update({
      status: 'approved',
      approvedBy: userId,
      approvedAt: new Date()
    });

    return cabinet;
  }

  static async rejectCabinet(id: string, userId: string, reason: string) {
    const cabinet = await Cabinet.findByPk(id);
    
    if (!cabinet) {
      throw new AppError(404, 'Cabinet not found');
    }

    // Check if user is an approver
    if (!cabinet.approvers.some(approver => approver.userId === userId)) {
      throw new AppError(403, 'User is not authorized to reject this cabinet');
    }

    // Check if cabinet is already approved or rejected
    if (cabinet.status === 'approved' || cabinet.status === 'rejected') {
      throw new AppError(400, `Cabinet is already ${cabinet.status}`);
    }

    // Update cabinet status
    await cabinet.update({
      status: 'rejected',
      rejectedBy: userId,
      rejectedAt: new Date(),
      rejectionReason: reason
    });

    return cabinet;
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
      // Validate that all cabinets belong to the space
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

      // Create new permissions
      await CabinetMemberPermission.bulkCreate(assignments, {
        transaction
      });

      // Create new cabinet member records
      await CabinetMember.bulkCreate(
        assignments.map(assignment => ({
          userId: assignment.userId,
          cabinetId: assignment.cabinetId,
          role: assignment.role,
          status: 'active'
        })),
        {
          transaction
        }
      );

      await transaction.commit();

      return true;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}