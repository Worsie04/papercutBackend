import { CabinetMember, CabinetMemberPermissions } from '../models/cabinet-member.model';
import { Cabinet } from '../models/cabinet.model';
import { User } from '../models/user.model';
import { AppError } from '../presentation/middlewares/errorHandler';
import { sequelize } from '../infrastructure/database/sequelize';
import { Transaction } from 'sequelize';

export class CabinetMemberService {
  static async assignUsers(
    cabinetIds: string[],
    userIds: string[],
    defaultPermissions: CabinetMemberPermissions = {
      canRead: true,
      canWrite: false,
      canDelete: false,
      canShare: false,
    }
  ): Promise<void> {
    await sequelize.transaction(async (transaction: Transaction) => {
      // Create array of all cabinet-user combinations
      const memberEntries = cabinetIds.flatMap(cabinetId =>
        userIds.map(userId => ({
          cabinetId,
          userId,
          role: 'member',
          permissions: defaultPermissions,
        }))
      );

      // Remove any existing assignments first
      await CabinetMember.destroy({
        where: {
          cabinetId: cabinetIds,
          userId: userIds,
        },
        transaction,
      });

      // Create new assignments
      await CabinetMember.bulkCreate(memberEntries, {
        transaction,
      });
    });
  }

  static async getCabinetMembers(cabinetId: string): Promise<CabinetMember[]> {
    const members = await CabinetMember.findAll({
      where: { cabinetId },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email', 'avatar'],
      }],
    });

    if (!members) {
      throw new AppError(404, 'No members found for this cabinet');
    }

    return members;
  }

  static async getUserCabinets(userId: string): Promise<Cabinet[]> {
    const cabinets = await Cabinet.findAll({
      include: [{
        model: CabinetMember,
        as: 'members',
        where: { userId },
        required: true,
      }],
    });

    if (!cabinets) {
      throw new AppError(404, 'No cabinets found for this user');
    }

    return cabinets;
  }

  static async updateMemberPermissions(
    cabinetId: string,
    userId: string,
    permissions: Partial<CabinetMemberPermissions>
  ): Promise<CabinetMember> {
    const member = await CabinetMember.findOne({
      where: { cabinetId, userId },
    });

    if (!member) {
      throw new AppError(404, 'Cabinet member not found');
    }

    const updatedMember = await member.update({
      permissions: {
        ...member.permissions,
        ...permissions,
      },
    });

    return updatedMember;
  }

  static async removeMember(cabinetId: string, userId: string): Promise<void> {
    const deleted = await CabinetMember.destroy({
      where: { cabinetId, userId },
    });

    if (!deleted) {
      throw new AppError(404, 'Cabinet member not found');
    }
  }

  static async removeAllMembers(cabinetId: string): Promise<void> {
    await CabinetMember.destroy({
      where: { cabinetId },
    });
  }

  static async getMemberPermissions(
    cabinetId: string,
    userId: string
  ): Promise<CabinetMemberPermissions> {
    const member = await CabinetMember.findOne({
      where: { cabinetId, userId },
    });

    if (!member) {
      throw new AppError(404, 'Cabinet member not found');
    }

    return member.permissions;
  }

  static async checkMemberAccess(
    cabinetId: string,
    userId: string,
    requiredPermission: keyof CabinetMemberPermissions
  ): Promise<boolean> {
    const member = await CabinetMember.findOne({
      where: { cabinetId, userId },
    });

    if (!member) {
      return false;
    }

    return member.permissions[requiredPermission] || false;
  }

  static async getMember(cabinetId: string, userId: string): Promise<CabinetMember | null> {
    // First check if user is a cabinet member
    const member = await CabinetMember.findOne({
      where: { cabinetId, userId },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email', 'avatar'],
      }],
    });

    if (member) {
      return member;
    }

    // If not a member, check if user is in approvers list
    const cabinet = await Cabinet.findByPk(cabinetId);
    if (!cabinet) {
      throw new AppError(404, 'Cabinet not found');
    }

    // Check if user is cabinet creator
    if (cabinet.createdById === userId) {
      return null; // Return null to indicate user has access but is not a member
    }

    // Check if user is in approvers list
    const isApprover = cabinet.approvers?.some(
      (approver: { userId: string }) => approver.userId === userId
    );
    
    if (isApprover) {
      return null; // Return null to indicate user has access but is not a member
    }

    // If none of the above conditions are met, throw error
    throw new AppError(404, 'Cabinet member not found');
  }
} 