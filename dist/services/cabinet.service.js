"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CabinetService = void 0;
const cabinet_model_1 = require("../models/cabinet.model");
const errorHandler_1 = require("../presentation/middlewares/errorHandler");
const user_model_1 = require("../models/user.model");
const space_model_1 = require("../models/space.model");
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
        const cabinet = await cabinet_model_1.Cabinet.findByPk(id);
        if (!cabinet) {
            throw new errorHandler_1.AppError(404, 'Cabinet not found');
        }
        return cabinet;
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
    static async approveCabinet(cabinetId) {
        try {
            const cabinet = await cabinet_model_1.Cabinet.findByPk(cabinetId);
            if (!cabinet) {
                throw new Error('Cabinet not found');
            }
            await cabinet.update({ status: 'approved' });
            return cabinet;
        }
        catch (error) {
            console.error('Error approving cabinet:', error);
            throw error;
        }
    }
    static async rejectCabinet(cabinetId, reason) {
        try {
            const cabinet = await cabinet_model_1.Cabinet.findByPk(cabinetId);
            if (!cabinet) {
                throw new Error('Cabinet not found');
            }
            await cabinet.update({
                status: 'rejected',
                rejectionReason: reason
            });
            return cabinet;
        }
        catch (error) {
            console.error('Error rejecting cabinet:', error);
            throw error;
        }
    }
}
exports.CabinetService = CabinetService;
