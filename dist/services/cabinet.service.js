"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CabinetService = void 0;
const cabinet_model_1 = require("../models/cabinet.model");
const errorHandler_1 = require("../presentation/middlewares/errorHandler");
const user_model_1 = require("../models/user.model");
const space_model_1 = require("../models/space.model");
const sequelize_1 = require("../infrastructure/database/sequelize");
const cabinet_member_model_1 = require("../models/cabinet-member.model");
const cabinet_member_permission_model_1 = require("../models/cabinet-member-permission.model");
const sequelize_2 = require("sequelize");
class CabinetService {
    static async createCabinet(data) {
        // Validate space exists
        const space = await space_model_1.Space.findByPk(data.spaceId);
        if (!space) {
            throw new errorHandler_1.AppError(404, 'Space not found');
        }
        // Validate parent cabinet if provided
        if (data.parentId) {
            const parentCabinet = await cabinet_model_1.Cabinet.findByPk(data.parentId);
            if (!parentCabinet) {
                throw new errorHandler_1.AppError(404, 'Parent cabinet not found');
            }
        }
        // Validate members exist
        if (data.members.length > 0) {
            const users = await user_model_1.User.findAll({
                where: { id: data.members }
            });
            if (users.length !== data.members.length) {
                throw new errorHandler_1.AppError(400, 'One or more members not found');
            }
        }
        // Validate approvers exist
        if (data.approvers.length > 0) {
            const approverIds = data.approvers.map(a => a.userId);
            const users = await user_model_1.User.findAll({
                where: { id: approverIds }
            });
            if (users.length !== approverIds.length) {
                throw new errorHandler_1.AppError(400, 'One or more approvers not found');
            }
        }
        // Create cabinet
        const cabinet = await cabinet_model_1.Cabinet.create(Object.assign(Object.assign({}, data), { status: 'pending', isActive: true }));
        return cabinet;
    }
    static async getCabinet(id) {
        const cabinet = await cabinet_model_1.Cabinet.findByPk(id, {
            include: [
                {
                    model: user_model_1.User,
                    as: 'createdBy',
                    attributes: ['id', 'firstName', 'lastName', 'avatar']
                }
            ]
        });
        if (!cabinet) {
            throw new errorHandler_1.AppError(404, 'Cabinet not found');
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
    static async getCabinets(spaceId) {
        return cabinet_model_1.Cabinet.findAll({
            where: { spaceId }
        });
    }
    static async getApprovedCabinets(spaceId) {
        return cabinet_model_1.Cabinet.findAll({
            where: {
                spaceId,
                status: 'approved',
                isActive: true
            }
        });
    }
    static async getPendingApprovals(userId) {
        try {
            console.log('Fetching pending cabinet approvals for user:', userId);
            const pendingCabinets = await cabinet_model_1.Cabinet.findAll({
                where: {
                    status: 'pending'
                },
                order: [['createdAt', 'DESC']]
            });
            console.log('Found pending cabinets:', pendingCabinets.length);
            const cabinetPromises = pendingCabinets.map(async (cabinet) => {
                const createdBy = await user_model_1.User.findByPk(cabinet.createdById, {
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
        }
        catch (error) {
            console.error('Error fetching pending cabinet approvals:', error);
            throw error;
        }
    }
    static async approveCabinet(id, userId) {
        const cabinet = await cabinet_model_1.Cabinet.findByPk(id);
        if (!cabinet) {
            throw new errorHandler_1.AppError(404, 'Cabinet not found');
        }
        // Check if user is an approver
        if (!cabinet.approvers.some(approver => approver.userId === userId)) {
            throw new errorHandler_1.AppError(403, 'User is not authorized to approve this cabinet');
        }
        // Check if cabinet is already approved
        if (cabinet.status === 'approved') {
            throw new errorHandler_1.AppError(400, 'Cabinet is already approved');
        }
        // Update cabinet status
        await cabinet.update({
            status: 'approved',
            approvedBy: userId,
            approvedAt: new Date()
        });
        return cabinet;
    }
    static async rejectCabinet(id, userId, reason) {
        const cabinet = await cabinet_model_1.Cabinet.findByPk(id);
        if (!cabinet) {
            throw new errorHandler_1.AppError(404, 'Cabinet not found');
        }
        // Check if user is an approver
        if (!cabinet.approvers.some(approver => approver.userId === userId)) {
            throw new errorHandler_1.AppError(403, 'User is not authorized to reject this cabinet');
        }
        // Check if cabinet is already approved or rejected
        if (cabinet.status === 'approved' || cabinet.status === 'rejected') {
            throw new errorHandler_1.AppError(400, `Cabinet is already ${cabinet.status}`);
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
    static async assignCabinetsToUsers(userIds, cabinetIds, spaceId) {
        // Verify that all cabinets exist and belong to the specified space
        const cabinets = await cabinet_model_1.Cabinet.findAll({
            where: {
                id: cabinetIds,
                spaceId: spaceId,
                status: 'approved' // Only allow assigning approved cabinets
            }
        });
        if (cabinets.length !== cabinetIds.length) {
            throw new errorHandler_1.AppError(404, 'One or more cabinets not found or not approved in the specified space');
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
        await sequelize_1.sequelize.transaction(async (transaction) => {
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
            await cabinet_member_model_1.CabinetMember.bulkCreate(assignments, {
                transaction,
                ignoreDuplicates: true // Skip if the assignment already exists
            });
        });
    }
    static async assignUsersWithPermissions(assignments, spaceId) {
        const transaction = await sequelize_1.sequelize.transaction();
        try {
            // Validate that all cabinets belong to the space
            const cabinetIds = [...new Set(assignments.map(a => a.cabinetId))];
            const cabinets = await cabinet_model_1.Cabinet.findAll({
                where: {
                    id: cabinetIds,
                    spaceId
                }
            });
            if (cabinets.length !== cabinetIds.length) {
                throw new errorHandler_1.AppError(400, 'Some cabinets do not belong to the specified space');
            }
            // Remove existing permissions for these user-cabinet combinations
            await cabinet_member_permission_model_1.CabinetMemberPermission.destroy({
                where: {
                    [sequelize_2.Op.or]: assignments.map(a => ({
                        userId: a.userId,
                        cabinetId: a.cabinetId
                    }))
                },
                transaction
            });
            // Remove existing cabinet member records
            await cabinet_member_model_1.CabinetMember.destroy({
                where: {
                    [sequelize_2.Op.or]: assignments.map(a => ({
                        userId: a.userId,
                        cabinetId: a.cabinetId
                    }))
                },
                transaction
            });
            // Create new permissions
            await cabinet_member_permission_model_1.CabinetMemberPermission.bulkCreate(assignments, {
                transaction
            });
            // Create new cabinet member records
            await cabinet_member_model_1.CabinetMember.bulkCreate(assignments.map(assignment => ({
                userId: assignment.userId,
                cabinetId: assignment.cabinetId,
                role: assignment.role,
                status: 'active'
            })), {
                transaction
            });
            await transaction.commit();
            return true;
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}
exports.CabinetService = CabinetService;
