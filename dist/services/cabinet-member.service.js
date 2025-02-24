"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CabinetMemberService = void 0;
const cabinet_member_model_1 = require("../models/cabinet-member.model");
const cabinet_model_1 = require("../models/cabinet.model");
const user_model_1 = require("../models/user.model");
const errorHandler_1 = require("../presentation/middlewares/errorHandler");
const sequelize_1 = require("../infrastructure/database/sequelize");
class CabinetMemberService {
    static async assignUsers(cabinetIds, userIds, defaultPermissions = {
        readRecords: true,
        createRecords: false,
        updateRecords: false,
        deleteRecords: false,
        manageCabinet: false,
        downloadFiles: true,
        exportTables: false
    }) {
        await sequelize_1.sequelize.transaction(async (transaction) => {
            // Create array of all cabinet-user combinations
            const memberEntries = cabinetIds.flatMap(cabinetId => userIds.map(userId => ({
                cabinetId,
                userId,
                role: 'member',
                permissions: defaultPermissions,
            })));
            // Remove any existing assignments first
            await cabinet_member_model_1.CabinetMember.destroy({
                where: {
                    cabinetId: cabinetIds,
                    userId: userIds,
                },
                transaction,
            });
            // Create new assignments
            await cabinet_member_model_1.CabinetMember.bulkCreate(memberEntries, {
                transaction,
            });
        });
    }
    static async getCabinetMembers(cabinetId) {
        const members = await cabinet_member_model_1.CabinetMember.findAll({
            where: { cabinetId },
            include: [{
                    model: user_model_1.User,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName', 'email', 'avatar'],
                }],
        });
        if (!members) {
            throw new errorHandler_1.AppError(404, 'No members found for this cabinet');
        }
        return members;
    }
    static async getUserCabinets(userId) {
        const cabinets = await cabinet_model_1.Cabinet.findAll({
            include: [{
                    model: cabinet_member_model_1.CabinetMember,
                    as: 'members',
                    where: { userId },
                    required: true,
                }],
        });
        if (!cabinets) {
            throw new errorHandler_1.AppError(404, 'No cabinets found for this user');
        }
        return cabinets;
    }
    static async updateMemberPermissions(cabinetId, userId, permissions) {
        const member = await cabinet_member_model_1.CabinetMember.findOne({
            where: { cabinetId, userId },
        });
        if (!member) {
            throw new errorHandler_1.AppError(404, 'Cabinet member not found');
        }
        const updatedMember = await member.update({
            permissions: Object.assign(Object.assign({}, member.permissions), permissions),
        });
        return updatedMember;
    }
    static async removeMember(cabinetId, userId) {
        const deleted = await cabinet_member_model_1.CabinetMember.destroy({
            where: { cabinetId, userId },
        });
        if (!deleted) {
            throw new errorHandler_1.AppError(404, 'Cabinet member not found');
        }
    }
    static async removeAllMembers(cabinetId) {
        await cabinet_member_model_1.CabinetMember.destroy({
            where: { cabinetId },
        });
    }
    static async getMemberPermissions(cabinetId, userId) {
        const member = await cabinet_member_model_1.CabinetMember.findOne({
            where: { cabinetId, userId },
        });
        if (!member) {
            throw new errorHandler_1.AppError(404, 'Cabinet member not found');
        }
        return member.permissions;
    }
    static async checkMemberAccess(cabinetId, userId, requiredPermission) {
        var _a;
        const member = await cabinet_member_model_1.CabinetMember.findOne({
            where: { cabinetId, userId },
        });
        if (!member) {
            return false;
        }
        const permissions = member.permissions;
        return (_a = permissions[requiredPermission]) !== null && _a !== void 0 ? _a : false;
    }
    static async getMember(cabinetId, userId) {
        var _a;
        // First check if user is a cabinet member
        const member = await cabinet_member_model_1.CabinetMember.findOne({
            where: { cabinetId, userId },
            include: [{
                    model: user_model_1.User,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName', 'email', 'avatar'],
                }],
        });
        if (member) {
            return member;
        }
        // If not a member, check if user is in approvers list
        const cabinet = await cabinet_model_1.Cabinet.findByPk(cabinetId);
        if (!cabinet) {
            throw new errorHandler_1.AppError(404, 'Cabinet not found');
        }
        // Check if user is cabinet creator
        if (cabinet.createdById === userId) {
            return null; // Return null to indicate user has access but is not a member
        }
        // Check if user is in approvers list
        const isApprover = (_a = cabinet.approvers) === null || _a === void 0 ? void 0 : _a.some((approver) => approver.userId === userId);
        if (isApprover) {
            return null; // Return null to indicate user has access but is not a member
        }
        // If none of the above conditions are met, throw error
        throw new errorHandler_1.AppError(404, 'Cabinet member not found');
    }
}
exports.CabinetMemberService = CabinetMemberService;
