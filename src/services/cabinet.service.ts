import { Cabinet, CustomField, CabinetApprover } from '../models/cabinet.model';
import { AppError } from '../presentation/middlewares/errorHandler';
import { User } from '../models/user.model';
import { Space } from '../models/space.model';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../infrastructure/database/sequelize';

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
    const cabinet = await Cabinet.findByPk(id);
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

  static async approveCabinet(cabinetId: string) {
    try {
      const cabinet = await Cabinet.findByPk(cabinetId);
      if (!cabinet) {
        throw new Error('Cabinet not found');
      }

      await cabinet.update({ status: 'approved' });
      return cabinet;
    } catch (error) {
      console.error('Error approving cabinet:', error);
      throw error;
    }
  }

  static async rejectCabinet(cabinetId: string, reason: string) {
    try {
      const cabinet = await Cabinet.findByPk(cabinetId);
      if (!cabinet) {
        throw new Error('Cabinet not found');
      }

      await cabinet.update({ 
        status: 'rejected',
        rejectionReason: reason
      });
      return cabinet;
    } catch (error) {
      console.error('Error rejecting cabinet:', error);
      throw error;
    }
  }
} 