"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityController = void 0;
const activity_service_1 = require("../../services/activity.service");
const activity_model_1 = require("../../models/activity.model");
class ActivityController {
    /**
     * Get recent activities for authenticated user
     */
    static async getRecentActivities(req, res) {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const activities = await activity_service_1.ActivityService.getRecentActivities(userId);
            res.json(activities);
        }
        catch (error) {
            console.error('Error getting recent activities:', error);
            res.status(500).json({ error: 'Failed to get recent activities' });
        }
    }
    /**
     * Get activities for an organization
     */
    static async getOrganizationActivities(req, res) {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            // Get user's organization ID from query params
            const { organizationId } = req.query;
            if (!organizationId) {
                return res.status(400).json({ error: 'Organization ID is required' });
            }
            const activities = await activity_service_1.ActivityService.getOrganizationActivities(organizationId);
            res.json(activities);
        }
        catch (error) {
            console.error('Error getting organization activities:', error);
            res.status(500).json({ error: 'Failed to get organization activities' });
        }
    }
    /**
     * Get activities for a space
     */
    static async getSpaceActivities(req, res) {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const { id } = req.params;
            const { filter, from, to } = req.query;
            const dateRange = from && to ? { from: new Date(from), to: new Date(to) } : undefined;
            const activities = await activity_service_1.ActivityService.getResourceActivities(activity_model_1.ResourceType.SPACE, id, filter, dateRange);
            res.json(activities);
        }
        catch (error) {
            console.error('Error getting space activities:', error);
            res.status(500).json({ error: 'Failed to get space activities' });
        }
    }
    /**
     * Get activities for a cabinet
     */
    static async getCabinetActivities(req, res) {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const { id } = req.params;
            const { filter, from, to } = req.query;
            const dateRange = from && to ? { from: new Date(from), to: new Date(to) } : undefined;
            const activities = await activity_service_1.ActivityService.getResourceActivities(activity_model_1.ResourceType.CABINET, id, filter, dateRange);
            res.json(activities);
        }
        catch (error) {
            console.error('Error getting cabinet activities:', error);
            res.status(500).json({ error: 'Failed to get cabinet activities' });
        }
    }
    /**
     * Get activities for a record
     */
    static async getRecordActivities(req, res) {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const { id } = req.params;
            const { filter, from, to } = req.query;
            const dateRange = from && to ? { from: new Date(from), to: new Date(to) } : undefined;
            const activities = await activity_service_1.ActivityService.getResourceActivities(activity_model_1.ResourceType.RECORD, id, filter, dateRange);
            res.json(activities);
        }
        catch (error) {
            console.error('Error getting record activities:', error);
            res.status(500).json({ error: 'Failed to get record activities' });
        }
    }
}
exports.ActivityController = ActivityController;
