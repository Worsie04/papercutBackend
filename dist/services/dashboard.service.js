"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const record_model_1 = require("../models/record.model");
const file_model_1 = __importDefault(require("../models/file.model"));
const sequelize_1 = require("sequelize");
const organization_member_model_1 = require("../models/organization-member.model");
class DashboardService {
    /**
     * Get dashboard statistics for a user's organization
     */
    static async getDashboardStats(userId, organizationId) {
        try {
            // Get organization members
            const organizationMembers = await organization_member_model_1.OrganizationMember.findAll({
                where: {
                    organizationId,
                    status: 'active'
                },
                attributes: ['userId']
            });
            const userIds = organizationMembers.map(member => member.userId);
            // Get total records count for the organization
            const totalRecordsCount = await record_model_1.Record.count({
                where: {
                    creatorId: {
                        [sequelize_1.Op.in]: userIds
                    }
                }
            });
            // Get new records count (created in the last 7 days)
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            const newRecordsCount = await record_model_1.Record.count({
                where: {
                    creatorId: {
                        [sequelize_1.Op.in]: userIds
                    },
                    createdAt: {
                        [sequelize_1.Op.gte]: oneWeekAgo
                    }
                }
            });
            // Get unallocated files for the organization
            const unallocatedFiles = await file_model_1.default.findAll({
                where: {
                    userId: {
                        [sequelize_1.Op.in]: userIds
                    },
                    isAllocated: false
                }
            });
            // Calculate total size in bytes
            const unallocatedSizeBytes = unallocatedFiles.reduce((total, file) => total + file.size, 0);
            // Format the file size in the most appropriate unit (KB, MB, or GB)
            let unallocatedSize;
            if (unallocatedSizeBytes < 1024) {
                // Less than 1 KB
                unallocatedSize = `${unallocatedSizeBytes} B`;
            }
            else if (unallocatedSizeBytes < 1024 * 1024) {
                // Less than 1 MB, show in KB
                const sizeInKB = (unallocatedSizeBytes / 1024).toFixed(2);
                unallocatedSize = `${sizeInKB} KB`;
            }
            else if (unallocatedSizeBytes < 1024 * 1024 * 1024) {
                // Less than 1 GB, show in MB
                const sizeInMB = (unallocatedSizeBytes / (1024 * 1024)).toFixed(2);
                unallocatedSize = `${sizeInMB} MB`;
            }
            else {
                // 1 GB or more, show in GB
                const sizeInGB = (unallocatedSizeBytes / (1024 * 1024 * 1024)).toFixed(2);
                unallocatedSize = `${sizeInGB} GB`;
            }
            return {
                totalRecords: totalRecordsCount,
                newRecords: newRecordsCount,
                unallocatedSize
            };
        }
        catch (error) {
            console.error('Error getting dashboard statistics:', error);
            throw error;
        }
    }
}
exports.DashboardService = DashboardService;
