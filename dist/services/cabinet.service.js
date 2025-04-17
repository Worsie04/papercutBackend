"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CabinetService = void 0;
const cabinet_model_1 = require("../models/cabinet.model");
const cabinet_note_comment_model_1 = require("../models/cabinet-note-comment.model");
const cabinet_reassignment_model_1 = require("../models/cabinet-reassignment.model");
const errorHandler_1 = require("../presentation/middlewares/errorHandler");
const user_model_1 = require("../models/user.model");
const space_model_1 = require("../models/space.model");
const sequelize_1 = require("../infrastructure/database/sequelize");
const cabinet_member_model_1 = require("../models/cabinet-member.model");
const cabinet_member_permission_model_1 = require("../models/cabinet-member-permission.model");
const sequelize_2 = require("sequelize");
const activity_service_1 = require("./activity.service");
const notification_service_1 = require("./notification.service");
const activity_model_1 = require("../models/activity.model");
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
                const users = await user_model_1.User.findAll({
                    where: { id: data.members }
                });
                if (users.length !== data.members.length) {
                    throw new errorHandler_1.AppError(400, 'One or more members not found');
                }
            }
            // Create cabinet with auto-approved status
            const cabinet = await cabinet_model_1.Cabinet.create(Object.assign(Object.assign({}, data), { status: 'approved', isActive: true, approvedBy: data.createdById, approvedAt: new Date() }));
            // Log cabinet creation activity for auto-approved cabinet
            try {
                await activity_service_1.ActivityService.logActivity({
                    userId: data.createdById,
                    action: activity_model_1.ActivityType.CREATE,
                    resourceType: activity_model_1.ResourceType.CABINET,
                    resourceId: cabinet.id,
                    resourceName: cabinet.name,
                    details: `Cabinet auto-approved in space ${space.name}`
                });
            }
            catch (error) {
                console.error('Failed to log cabinet creation activity:', error);
            }
            // Process members: assign selected users as cabinet members with default permissions
            if (data.members && data.members.length > 0) {
                const assignments = data.members.map((memberId) => ({
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
            const users = await user_model_1.User.findAll({
                where: { id: data.members }
            });
            if (users.length !== data.members.length) {
                throw new errorHandler_1.AppError(400, 'One or more members not found');
            }
        }
        // Validate approvers exist (only required when approval is needed)
        if (data.approvers && data.approvers.length > 0) {
            const approverIds = data.approvers.map(a => a.userId);
            const users = await user_model_1.User.findAll({
                where: { id: approverIds }
            });
            if (users.length !== approverIds.length) {
                throw new errorHandler_1.AppError(400, 'One or more approvers not found');
            }
        }
        // Create cabinet with pending status
        const cabinet = await cabinet_model_1.Cabinet.create(Object.assign(Object.assign({}, data), { status: 'pending', isActive: true }));
        // Log cabinet creation activity
        try {
            await activity_service_1.ActivityService.logActivity({
                userId: data.createdById,
                action: activity_model_1.ActivityType.CREATE,
                resourceType: activity_model_1.ResourceType.CABINET,
                resourceId: cabinet.id,
                resourceName: cabinet.name,
                details: `Cabinet created in space ${space.name}`
            });
        }
        catch (error) {
            console.error('Failed to log cabinet creation activity:', error);
        }
        // Send notifications to approvers if needed
        if (data.approvers && data.approvers.length > 0) {
            try {
                const creator = await user_model_1.User.findByPk(data.createdById);
                const creatorName = creator ? `${creator.firstName} ${creator.lastName}` : 'A user';
                for (const approver of data.approvers) {
                    await notification_service_1.NotificationService.createCabinetCreationNotification(approver.userId, cabinet.id, cabinet.name, creatorName);
                }
            }
            catch (error) {
                console.error('Error sending cabinet creation notifications:', error);
            }
        }
        // Process members in pending branch
        if (data.members && data.members.length > 0) {
            const assignments = data.members.map((memberId) => ({
                userId: memberId,
                cabinetId: cabinet.id,
                role: 'member_full',
                permissions: defaultPermissions
            }));
            await CabinetService.assignUsersWithPermissions(assignments, data.spaceId);
        }
        return cabinet;
    }
    static async getCabinet(id) {
        const cabinet = await cabinet_model_1.Cabinet.findByPk(id, {
            include: [
                {
                    model: user_model_1.User,
                    as: 'creator',
                    attributes: ['id', 'firstName', 'lastName', 'avatar']
                },
                {
                    model: user_model_1.User,
                    as: 'members',
                    attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
                },
                {
                    model: cabinet_note_comment_model_1.CabinetNoteComment,
                    as: 'notesAndComments',
                    required: false,
                    include: [{
                            model: user_model_1.User,
                            as: 'creator',
                            attributes: ['id', 'firstName', 'lastName', 'avatar']
                        }]
                }
            ]
        });
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
            // console.log('Fetching pending cabinet approvals for user:', userId);
            const pendingCabinets = await cabinet_model_1.Cabinet.findAll({
                where: {
                    status: 'pending'
                },
                include: [{
                        model: user_model_1.User,
                        as: 'creator',
                        attributes: ['id', 'firstName', 'lastName', 'avatar']
                    }],
                order: [['createdAt', 'DESC']]
            });
            return pendingCabinets.map(cabinet => {
                const cabinetData = cabinet.get({ plain: true });
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
        }
        catch (error) {
            console.error('Error fetching pending cabinet approvals:', error);
            throw error;
        }
    }
    static async getMyPendingApprovals(userId, status) {
        try {
            const pendingCabinets = await cabinet_model_1.Cabinet.findAll({
                where: {
                    status,
                    createdById: userId
                },
                include: [{
                        model: user_model_1.User,
                        as: 'creator',
                        attributes: ['id', 'firstName', 'lastName', 'avatar']
                    }],
                order: [['createdAt', 'DESC']]
            });
            return pendingCabinets.map(cabinet => {
                const cabinetData = cabinet.get({ plain: true });
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
        }
        catch (error) {
            console.error('Error fetching my pending cabinet approvals:', error);
            throw error;
        }
    }
    static async getApprovalsWaitingFor(userId) {
        try {
            // 1. İlk öncə reassignment olan cabinetləri axtarırıq
            const reassignedCabinets = await cabinet_model_1.Cabinet.findAll({
                where: {
                    status: 'pending'
                },
                include: [{
                        model: cabinet_reassignment_model_1.CabinetReassignment, // Əgər Cabinet modelində association "reassignments" kimi təyin edilibsə
                        as: 'reassignments',
                        required: true,
                        where: {
                            toUserId: userId
                        }
                    }],
                order: [['createdAt', 'DESC']]
            });
            // 2. Reassignment qeydi olmayan və approvers JSONB massivində userId olan cabinetləri axtarırıq
            const pendingCabinets = await cabinet_model_1.Cabinet.findAll({
                where: {
                    status: 'pending',
                    [sequelize_2.Op.and]: [
                        // Bu cabinet üçün reassignment qeydi olmamalıdır
                        sequelize_1.sequelize.literal(`NOT EXISTS (
              SELECT 1 FROM cabinet_reassignments AS cr 
              WHERE cr.cabinet_id = "Cabinet".id
            )`),
                        // Approvers massivində userId axtarılır
                        sequelize_1.sequelize.literal(`EXISTS (
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
            const cabinetPromises = combinedCabinets.map(async (cabinet) => {
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
            console.error('Error fetching cabinets waiting for approval:', error);
            throw error;
        }
    }
    static async updateCabinet(id, updatedData, userId) {
        // Cabinet-i tapırıq
        const cabinet = await cabinet_model_1.Cabinet.findByPk(id);
        if (!cabinet) {
            throw new errorHandler_1.AppError(404, 'Cabinet not found');
        }
        if (cabinet.createdById !== userId) {
            throw new errorHandler_1.AppError(403, 'User is not authorized to update this cabinet');
        }
        // Kabinetin əsas məlumatlarını update edirik
        await cabinet.update(updatedData);
        // Əgər updatedData.comments varsa, comment qeydini yaradırıq
        if (updatedData.comments && updatedData.comments.trim() !== '') {
            await cabinet_note_comment_model_1.CabinetNoteComment.create({
                cabinetId: id,
                content: updatedData.comments,
                type: 'comment',
                action: 'update',
                createdBy: userId
            });
        }
        // Əgər updatedData.note varsa, note qeydini yaradırıq
        if (updatedData.note && updatedData.note.trim() !== '') {
            await cabinet_note_comment_model_1.CabinetNoteComment.create({
                cabinetId: id,
                content: updatedData.note,
                type: 'note',
                action: 'update',
                createdBy: userId
            });
        }
        // Sonuncu reassign edilmiş super useri tapırıq
        const latestReassignment = await cabinet_reassignment_model_1.CabinetReassignment.findOne({
            where: { cabinetId: id },
            order: [['createdAt', 'DESC']]
        });
        let targetApproverId = null;
        if (latestReassignment) {
            targetApproverId = latestReassignment.toUserId;
        }
        else {
            // Əgər reassign olunmayıbsa, kabinetdəki approversdən istifadə edirik
            const cabinetData = cabinet.get({ plain: true });
            if (cabinetData.approvers && cabinetData.approvers.length > 0) {
                targetApproverId = cabinetData.approvers[0].userId;
            }
        }
        // Əgər təsdiq üçün hədəf approver müəyyən edilibsə, activity log və notification göndəririk
        if (targetApproverId) {
            try {
                await activity_service_1.ActivityService.logActivity({
                    userId,
                    action: activity_model_1.ActivityType.UPDATE, // Yaxud xüsusi bir action: "update_and_resubmit"
                    resourceType: activity_model_1.ResourceType.CABINET,
                    resourceId: id,
                    resourceName: cabinet.name,
                    details: 'Cabinet updated and resubmitted for approval'
                });
            }
            catch (error) {
                console.error('Failed to log cabinet update activity:', error);
            }
            try {
                await notification_service_1.NotificationService.createCabinetResubmittedlNotification(targetApproverId, id, cabinet.name);
            }
            catch (error) {
                console.error('Error sending update approval notification:', error);
            }
        }
        return cabinet;
    }
    static async approveCabinet(id, userId, note, updatedData, comments) {
        var _a;
        const transaction = await sequelize_1.sequelize.transaction();
        try {
            const cabinet = await cabinet_model_1.Cabinet.findByPk(id, {
                include: [{
                        model: user_model_1.User,
                        as: 'creator',
                        attributes: ['id', 'firstName', 'lastName']
                    }],
                transaction
            });
            if (!cabinet) {
                throw new errorHandler_1.AppError(404, 'Cabinet not found');
            }
            if (updatedData && Object.keys(updatedData).length > 0) {
                await cabinet.update(updatedData, { transaction });
            }
            const cabinetData = cabinet.get({ plain: true });
            // Əvvəlcə cabinet.approvers arrayində istifadəçini axtarırıq
            const isApproverInCabinet = (_a = cabinetData.approvers) === null || _a === void 0 ? void 0 : _a.some((approver) => approver.userId === userId);
            // Əgər tapılmırsa, cabinets_reassignments cədvəlində yoxlayırıq
            if (!isApproverInCabinet) {
                const reassignment = await cabinet_reassignment_model_1.CabinetReassignment.findOne({
                    where: { cabinetId: id, toUserId: userId }
                });
                if (!reassignment) {
                    throw new errorHandler_1.AppError(403, 'User is not authorized to approve this cabinet');
                }
            }
            if (cabinetData.status === 'approved') {
                throw new errorHandler_1.AppError(400, 'Cabinet is already approved');
            }
            await cabinet.update({
                status: 'approved',
                approvedBy: userId,
                approvedAt: new Date()
            }, { transaction });
            await cabinet_note_comment_model_1.CabinetNoteComment.create({
                cabinetId: id,
                content: note || 'Cabinet approved',
                type: 'system',
                action: 'approve',
                createdBy: userId
            }, { transaction });
            if (comments) {
                await cabinet_note_comment_model_1.CabinetNoteComment.create({
                    cabinetId: id,
                    content: comments,
                    type: 'comment',
                    action: 'approve',
                    createdBy: userId
                }, { transaction });
            }
            try {
                await activity_service_1.ActivityService.logActivity({
                    userId,
                    action: activity_model_1.ActivityType.APPROVE,
                    resourceType: activity_model_1.ResourceType.CABINET,
                    resourceId: id,
                    resourceName: cabinetData.name,
                    details: 'Cabinet approved'
                });
            }
            catch (error) {
                console.error('Failed to log cabinet approval activity:', error);
            }
            if (cabinetData.creator) {
                try {
                    await notification_service_1.NotificationService.createCabinetApprovalNotification(cabinetData.creator.id, id, cabinetData.name);
                }
                catch (error) {
                    console.error('Error sending cabinet approval notification:', error);
                }
            }
            await transaction.commit();
            return cabinet;
        }
        catch (error) {
            try {
                await transaction.rollback();
            }
            catch (rollbackError) {
                console.error('Rollback failed:', rollbackError);
            }
            throw error;
        }
    }
    static async rejectCabinet(id, userId, reason, note, comments, updatedData) {
        var _a;
        const transaction = await sequelize_1.sequelize.transaction();
        try {
            const cabinet = await cabinet_model_1.Cabinet.findByPk(id, {
                include: [{
                        model: user_model_1.User,
                        as: 'creator',
                        attributes: ['id', 'firstName', 'lastName']
                    }],
                transaction
            });
            if (!cabinet) {
                throw new errorHandler_1.AppError(404, 'Cabinet not found');
            }
            if (updatedData && Object.keys(updatedData).length > 0) {
                await cabinet.update(updatedData, { transaction });
            }
            const cabinetData = cabinet.get({ plain: true });
            // İlk növbədə cabinet.approvers arrayində yoxlayırıq
            const isApproverInCabinet = (_a = cabinetData.approvers) === null || _a === void 0 ? void 0 : _a.some((approver) => approver.userId === userId);
            // Tapılmadıqda, cabinet_reassignments cədvəlində axtarırıq
            if (!isApproverInCabinet) {
                const reassignment = await cabinet_reassignment_model_1.CabinetReassignment.findOne({
                    where: { cabinetId: id, toUserId: userId }
                });
                if (!reassignment) {
                    throw new errorHandler_1.AppError(403, 'User is not authorized to reject this cabinet');
                }
            }
            if (cabinetData.status === 'approved' || cabinetData.status === 'rejected') {
                throw new errorHandler_1.AppError(400, `Cabinet is already ${cabinetData.status}`);
            }
            await cabinet.update({
                status: 'rejected',
                rejectedBy: userId,
                rejectedAt: new Date(),
                rejectionReason: reason
            }, { transaction });
            if (note) {
                await cabinet_note_comment_model_1.CabinetNoteComment.create({
                    cabinetId: id,
                    content: note,
                    type: 'note',
                    action: 'reject',
                    createdBy: userId
                }, { transaction });
            }
            if (comments) {
                await cabinet_note_comment_model_1.CabinetNoteComment.create({
                    cabinetId: id,
                    content: comments,
                    type: 'comment',
                    action: 'reject',
                    createdBy: userId
                }, { transaction });
            }
            try {
                await activity_service_1.ActivityService.logActivity({
                    userId,
                    action: activity_model_1.ActivityType.REJECT,
                    resourceType: activity_model_1.ResourceType.CABINET,
                    resourceId: id,
                    resourceName: cabinetData.name,
                    details: reason || 'Cabinet rejected'
                });
            }
            catch (error) {
                console.error('Failed to log cabinet rejection activity:', error);
            }
            if (cabinetData.creator) {
                try {
                    await notification_service_1.NotificationService.createCabinetRejectionNotification(cabinetData.creator.id, id, cabinetData.name, reason);
                }
                catch (error) {
                    console.error('Error sending cabinet rejection notification:', error);
                }
            }
            await transaction.commit();
            return cabinet;
        }
        catch (error) {
            try {
                await transaction.rollback();
            }
            catch (rollbackError) {
                console.error('Rollback failed:', rollbackError);
            }
            throw error;
        }
    }
    static async reassignCabinet(id, userId, newApproverId, note) {
        var _a;
        const transaction = await sequelize_1.sequelize.transaction();
        try {
            // creator əlaqəsini əlavə edirik ki, cabinetData.creator mövcud olsun
            const cabinet = await cabinet_model_1.Cabinet.findByPk(id, {
                include: [{
                        model: user_model_1.User,
                        as: 'creator',
                        attributes: ['id', 'firstName', 'lastName', 'avatar']
                    }],
                transaction
            });
            if (!cabinet) {
                throw new errorHandler_1.AppError(404, 'Cabinet not found');
            }
            const cabinetData = cabinet.get({ plain: true });
            // Authorization: əvvəlcə cabinet.approvers yoxlanılır, əgər tapılmırsa, reassignment cədvəlindən yoxlanılır
            const isApproverInCabinet = (_a = cabinetData.approvers) === null || _a === void 0 ? void 0 : _a.some((a) => a.userId === userId);
            if (!isApproverInCabinet) {
                const reassignment = await cabinet_reassignment_model_1.CabinetReassignment.findOne({
                    where: { cabinetId: id, toUserId: userId }
                });
                if (!reassignment) {
                    throw new errorHandler_1.AppError(403, 'User is not authorized to reassign this cabinet');
                }
            }
            // Biznes loqikasına görə reassign: mövcud approvers siyahısında ilk elementi yeni approver ilə əvəz edirik
            let approvers = cabinetData.approvers || [];
            if (approvers.length > 0) {
                approvers[0].userId = newApproverId;
            }
            else {
                approvers.push({ userId: newApproverId, order: 1 });
            }
            await cabinet.update({ approvers }, { transaction });
            // Cabinet reassignment cədvəlində qeydiyyat əlavə edirik
            await cabinet_reassignment_model_1.CabinetReassignment.create({
                cabinetId: id,
                fromUserId: userId,
                toUserId: newApproverId,
                message: note || 'Cabinet reassigned'
            }, { transaction });
            // Reassign qeydini əlavə edirik (CabinetNoteComment modelindən istifadə edərək)
            await cabinet_note_comment_model_1.CabinetNoteComment.create({
                cabinetId: id,
                content: note || 'Cabinet reassigned',
                type: 'system',
                action: 'reassign',
                createdBy: userId
            }, { transaction });
            // Activity log
            try {
                await activity_service_1.ActivityService.logActivity({
                    userId,
                    action: activity_model_1.ActivityType.REASSIGN,
                    resourceType: activity_model_1.ResourceType.CABINET,
                    resourceId: id,
                    resourceName: cabinetData.name,
                    details: `Cabinet reassigned to ${newApproverId}`
                });
            }
            catch (error) {
                console.error('Failed to log cabinet reassign activity:', error);
            }
            // Notification – yeni approver-ə bildiriş göndəririk
            try {
                await notification_service_1.NotificationService.createCabinetReassignmentNotification(newApproverId, id, cabinetData.name);
            }
            catch (error) {
                console.error('Error sending cabinet reassignment notification:', error);
            }
            await transaction.commit();
            return cabinet;
        }
        catch (error) {
            try {
                await transaction.rollback();
            }
            catch (rollbackError) {
                console.error('Rollback failed:', rollbackError);
            }
            throw error;
        }
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
            // Log cabinet assignment activities
            try {
                for (const cabinet of cabinets) {
                    for (const userId of userIds) {
                        await activity_service_1.ActivityService.logActivity({
                            userId,
                            action: activity_model_1.ActivityType.REASSIGN,
                            resourceType: activity_model_1.ResourceType.CABINET,
                            resourceId: cabinet.id,
                            resourceName: cabinet.name,
                            details: 'User assigned to cabinet'
                        });
                    }
                }
            }
            catch (error) {
                console.error('Failed to log cabinet assignment activity:', error);
            }
        });
    }
    static async assignUsersWithPermissions(assignments, spaceId) {
        const transaction = await sequelize_1.sequelize.transaction();
        try {
            // Validate that all cabinets belong to the specified space
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
            // 1. Create new cabinet member records and retrieve them (with returning: true)
            const createdMembers = await cabinet_member_model_1.CabinetMember.bulkCreate(assignments.map(assignment => ({
                userId: assignment.userId,
                cabinetId: assignment.cabinetId,
                role: assignment.role,
                status: 'active'
            })), { transaction, returning: true });
            // 2. Create new permission records by linking them to the corresponding cabinet member id
            const permissionRecords = assignments.map(assignment => {
                const matchingMember = createdMembers.find(m => m.userId === assignment.userId && m.cabinetId === assignment.cabinetId);
                if (!matchingMember) {
                    throw new errorHandler_1.AppError(400, 'Cabinet member record not found for assignment');
                }
                return {
                    userId: assignment.userId,
                    cabinetId: assignment.cabinetId,
                    role: assignment.role,
                    permissions: assignment.permissions,
                    cabinet_member_id: matchingMember.id
                };
            });
            await cabinet_member_permission_model_1.CabinetMemberPermission.bulkCreate(permissionRecords, { transaction });
            // Log cabinet permissions assignments
            try {
                const cabinetMap = new Map(cabinets.map(cabinet => [cabinet.id, cabinet]));
                for (const assignment of assignments) {
                    const cabinet = cabinetMap.get(assignment.cabinetId);
                    if (cabinet) {
                        await activity_service_1.ActivityService.logActivity({
                            userId: assignment.userId,
                            action: activity_model_1.ActivityType.UPDATE_PERMISSIONS,
                            resourceType: activity_model_1.ResourceType.CABINET,
                            resourceId: assignment.cabinetId,
                            resourceName: cabinet.name,
                            details: `Cabinet permissions updated to role: ${assignment.role}`
                        });
                    }
                }
            }
            catch (error) {
                console.error('Failed to log cabinet permissions activity:', error);
            }
            await transaction.commit();
            return true;
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    static async deleteCabinet(id, userId) {
        try {
            // 1. Verify the cabinet exists
            const cabinet = await cabinet_model_1.Cabinet.findByPk(id);
            if (!cabinet) {
                throw new Error('Cabinet not found');
            }
            // Store cabinet name for logging before deletion
            const cabinetName = cabinet.name;
            // 2. Delete the cabinet and related records using a transaction
            const transaction = await sequelize_1.sequelize.transaction();
            try {
                // Delete cabinet members
                await cabinet_member_model_1.CabinetMember.destroy({
                    where: { cabinetId: id },
                    transaction
                });
                // Delete cabinet member permissions
                await cabinet_member_permission_model_1.CabinetMemberPermission.destroy({
                    where: { cabinetId: id },
                    transaction
                });
                // Delete cabinet (will cascade to other records as defined in your models)
                await cabinet.destroy({ transaction });
                // Commit the transaction
                await transaction.commit();
                // Log cabinet deletion activity after successful deletion
                try {
                    await activity_service_1.ActivityService.logActivity({
                        userId,
                        action: activity_model_1.ActivityType.DELETE,
                        resourceType: activity_model_1.ResourceType.CABINET,
                        resourceId: id,
                        resourceName: cabinetName,
                        details: 'Cabinet deleted'
                    });
                }
                catch (error) {
                    console.error('Failed to log cabinet deletion activity:', error);
                }
                return true;
            }
            catch (error) {
                // Rollback the transaction if any operation fails
                await transaction.rollback();
                console.error('Error during cabinet deletion:', error);
                throw error;
            }
        }
        catch (error) {
            console.error('Error deleting cabinet:', error);
            throw error;
        }
    }
}
exports.CabinetService = CabinetService;
