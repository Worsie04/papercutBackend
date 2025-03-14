import { Record, RecordStatus } from '../models/record.model';
import File from '../models/file.model';
import { Op } from 'sequelize';
import { sequelize } from '../infrastructure/database/sequelize';
import { User } from '../models/user.model';
import { OrganizationMember } from '../models/organization-member.model';

export class DashboardService {
  /**
   * Get dashboard statistics for a user's organization
   */
  static async getDashboardStats(userId: string, organizationId: string) {
    try {
      // Get organization members
      const organizationMembers = await OrganizationMember.findAll({
        where: {
          organizationId,
          status: 'active'
        },
        attributes: ['userId']
      });
      
      const userIds = organizationMembers.map(member => member.userId);
      
      // Get total records count for the organization
      const totalRecordsCount = await Record.count({
        where: {
          creatorId: {
            [Op.in]: userIds
          }
        }
      });

      // Get new records count (created in the last 7 days)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const newRecordsCount = await Record.count({
        where: {
          creatorId: {
            [Op.in]: userIds
          },
          createdAt: {
            [Op.gte]: oneWeekAgo
          }
        }
      });

      // Get unallocated files for the organization
      const unallocatedFiles = await File.findAll({
        where: {
          userId: {
            [Op.in]: userIds
          },
          isAllocated: false
        }
      });
      
      // Calculate total size in bytes
      const unallocatedSizeBytes = unallocatedFiles.reduce((total, file) => total + file.size, 0);
      
      // Format the file size in the most appropriate unit (KB, MB, or GB)
      let unallocatedSize: string;
      
      if (unallocatedSizeBytes < 1024) {
        // Less than 1 KB
        unallocatedSize = `${unallocatedSizeBytes} B`;
      } else if (unallocatedSizeBytes < 1024 * 1024) {
        // Less than 1 MB, show in KB
        const sizeInKB = (unallocatedSizeBytes / 1024).toFixed(2);
        unallocatedSize = `${sizeInKB} KB`;
      } else if (unallocatedSizeBytes < 1024 * 1024 * 1024) {
        // Less than 1 GB, show in MB
        const sizeInMB = (unallocatedSizeBytes / (1024 * 1024)).toFixed(2);
        unallocatedSize = `${sizeInMB} MB`;
      } else {
        // 1 GB or more, show in GB
        const sizeInGB = (unallocatedSizeBytes / (1024 * 1024 * 1024)).toFixed(2);
        unallocatedSize = `${sizeInGB} GB`;
      }

      return {
        totalRecords: totalRecordsCount,
        newRecords: newRecordsCount,
        unallocatedSize
      };
    } catch (error) {
      console.error('Error getting dashboard statistics:', error);
      throw error;
    }
  }
} 