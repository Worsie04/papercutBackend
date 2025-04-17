"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const dashboard_service_1 = require("../../services/dashboard.service");
const organization_member_model_1 = require("../../models/organization-member.model");
class DashboardController {
    /**
     * Get dashboard statistics
     */
    static async getDashboardStats(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const userId = req.user.id;
            // Get the user's organization through OrganizationMember
            const organizationMember = await organization_member_model_1.OrganizationMember.findOne({
                where: {
                    userId,
                    status: 'active'
                }
            });
            if (!organizationMember) {
                res.status(404).json({ error: 'User is not a member of any organization' });
                return;
            }
            const organizationId = organizationMember.organizationId;
            const stats = await dashboard_service_1.DashboardService.getDashboardStats(userId, organizationId);
            res.status(200).json(stats);
        }
        catch (error) {
            console.error('Error getting dashboard statistics:', error);
            res.status(500).json({ error: 'Failed to get dashboard statistics' });
        }
    }
}
exports.DashboardController = DashboardController;
