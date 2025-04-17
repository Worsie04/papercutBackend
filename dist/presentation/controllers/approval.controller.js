"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApprovalController = void 0;
const space_service_1 = require("../../services/space.service");
const cabinet_service_1 = require("../../services/cabinet.service");
const space_comment_service_1 = require("../../services/space-comment.service");
const record_service_1 = require("../../services/record.service");
class ApprovalController {
    /**
     * Get all pending approvals
     */
    static async getApprovals(req, res) {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }
            // Fetch pending cabinet creation requests
            const pendingCabinets = await cabinet_service_1.CabinetService.getPendingApprovals(userId);
            const cabinetRequests = pendingCabinets.map(cabinet => ({
                id: cabinet.id,
                type: 'cabinet',
                name: cabinet.name,
                createdBy: cabinet.createdBy.name,
                createdAt: cabinet.createdAt,
                priority: 'Med',
            }));
            // Fetch pending space creation requests
            const pendingSpaces = await space_service_1.SpaceService.getPendingApprovals(userId);
            const spaceRequests = pendingSpaces.map(space => ({
                id: space.id,
                type: 'space',
                name: space.name,
                createdBy: space.createdBy.name,
                createdAt: space.createdAt,
                priority: 'Med',
            }));
            // Combine all requests
            const allRequests = [...cabinetRequests, ...spaceRequests];
            // Sort by creation date, newest first
            allRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            res.json(allRequests);
        }
        catch (error) {
            console.error('Error fetching approvals:', error);
            res.status(500).json({ error: 'Failed to fetch approvals' });
        }
    }
    /**
     * Get pending approvals that were created by the user
     */
    static async getMyPendingApprovals(req, res) {
        var _a;
        try {
            const { status } = req.query;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            const statusStr = typeof status === 'string' ? status : '';
            if (!userId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }
            // Fetch pending cabinet creation requests created by current user
            const pendingCabinets = await cabinet_service_1.CabinetService.getMyPendingApprovals(userId, statusStr);
            const cabinetRequests = pendingCabinets.map(cabinet => ({
                id: cabinet.id,
                type: 'cabinet',
                name: cabinet.name,
                createdBy: cabinet.createdBy,
                createdAt: cabinet.createdAt,
                status: 'pending',
                priority: 'Med',
            }));
            // Fetch pending space creation requests created by current user
            const pendingSpaces = await space_service_1.SpaceService.getMyPendingApprovals(userId);
            const spaceRequests = pendingSpaces.map(space => ({
                id: space.id,
                type: 'space',
                name: space.name,
                createdBy: space.owner,
                createdAt: space.createdAt,
                status: 'pending',
                priority: 'Med',
            }));
            // Combine all requests
            const allRequests = [...cabinetRequests, ...spaceRequests];
            // Sort by creation date, newest first
            allRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            res.json(allRequests);
        }
        catch (error) {
            console.error('Error fetching my pending approvals:', error);
            res.status(500).json({ error: 'Failed to fetch your pending approvals' });
        }
    }
    /**
     * Get approvals that are waiting for the user
     */
    static async getApprovalsWaitingForMe(req, res) {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }
            const pendingRecords = await record_service_1.RecordService.getRecordsWaitingForMyApproval(userId);
            const recordRequests = pendingRecords.map((record) => ({
                id: record.id,
                type: 'record',
                name: record.title,
                createdBy: record.creator ? {
                    id: record.creator.id,
                    name: `${record.creator.firstName} ${record.creator.lastName}`,
                    avatar: record.creator.avatar
                } : {
                    id: record.creatorId,
                    name: 'Unknown User',
                    avatar: null
                },
                createdAt: record.createdAt,
                status: 'pending',
                priority: 'Med',
            }));
            // Fetch cabinet creation requests waiting for current user's approval
            const pendingCabinets = await cabinet_service_1.CabinetService.getApprovalsWaitingFor(userId);
            const cabinetRequests = pendingCabinets.map(cabinet => ({
                id: cabinet.id,
                type: 'cabinet',
                name: cabinet.name,
                createdBy: cabinet.createdBy,
                createdAt: cabinet.createdAt,
                status: 'pending',
                priority: 'Med',
            }));
            // Fetch space creation requests waiting for current user's approval
            const pendingSpaces = await space_service_1.SpaceService.getApprovalsWaitingFor(userId);
            const spaceRequests = pendingSpaces.map(space => ({
                id: space.id,
                type: 'space',
                name: space.name,
                createdBy: space.owner,
                createdAt: space.createdAt,
                status: 'pending',
                priority: 'Med',
            }));
            // Combine all requests
            const allRequests = [...cabinetRequests, ...spaceRequests, ...recordRequests];
            // Sort by creation date, newest first
            allRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            res.json(allRequests);
        }
        catch (error) {
            console.error('Error fetching approvals waiting for me:', error);
            res.status(500).json({ error: 'Failed to fetch approvals waiting for you' });
        }
    }
    static async approveRequest(req, res) {
        var _a;
        try {
            const { id } = req.params;
            const { type } = req.body;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }
            if (type === 'cabinet') {
                await cabinet_service_1.CabinetService.approveCabinet(id, userId);
            }
            else if (type === 'space') {
                await space_service_1.SpaceService.approveSpace(id, userId);
                // Store the approval as a comment
                const comment = req.body.comment;
                if (comment && comment.trim()) {
                    await space_comment_service_1.SpaceCommentService.createComment({
                        spaceId: id,
                        userId,
                        message: comment,
                        type: 'approval'
                    });
                }
            }
            else {
                return res.status(400).json({ error: 'Invalid request type' });
            }
            res.json({ message: 'Request approved successfully' });
        }
        catch (error) {
            console.error('Error approving request:', error);
            res.status(500).json({ error: 'Failed to approve request' });
        }
    }
    static async rejectRequest(req, res) {
        var _a;
        try {
            const { id } = req.params;
            const { type, reason } = req.body;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }
            if (type === 'cabinet') {
                await cabinet_service_1.CabinetService.rejectCabinet(id, userId, reason);
            }
            else if (type === 'space') {
                await space_service_1.SpaceService.rejectSpace(id, reason, userId);
                // Store the rejection reason as a comment
                if (reason && reason.trim()) {
                    await space_comment_service_1.SpaceCommentService.createComment({
                        spaceId: id,
                        userId,
                        message: reason,
                        type: 'rejection'
                    });
                }
            }
            else {
                return res.status(400).json({ error: 'Invalid request type' });
            }
            res.json({ message: 'Request rejected successfully' });
        }
        catch (error) {
            console.error('Error rejecting request:', error);
            res.status(500).json({ error: 'Failed to reject request' });
        }
    }
}
exports.ApprovalController = ApprovalController;
