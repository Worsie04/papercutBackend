import { v4 as uuidv4 } from 'uuid';
import File from '../models/file.model';
import RecordFile from '../models/record-file.model';
import { Record } from '../models/record.model';
import { uploadFileToR2 } from '../utils/r2.util';

export class FileService {
  /**
   * Save uploaded file to Cloudflare R2 and database
   */
  async saveFile(file: any, userId: string): Promise<any> {
    try {
      // Generate a unique filename while preserving the original extension
      const fileExtension = file.originalname.split('.').pop();
      const uniqueFilename = `${uuidv4()}.${fileExtension}`;
      const folder = 'uploads'; // You can organize files in folders

      // Upload to Cloudflare R2
      await uploadFileToR2(
        file.buffer,
        uniqueFilename,
        folder,
        file.mimetype
      );

      // Create file record in the database
      const fileRecord = await File.create({
        name: uniqueFilename,
        originalName: file.originalname,
        path: `${folder}/${uniqueFilename}`,
        type: file.mimetype,
        size: file.size,
        isAllocated: false,
        userId
      });

      return fileRecord;
    } catch (error) {
      console.error('Error saving file:', error);
      throw error;
    }
  }

  /**
   * Save multiple files to Cloudflare R2 and database
   */
  async saveMultipleFiles(files: Express.Multer.File[], userId: string): Promise<any[]> {
    try {
      const savedFiles = await Promise.all(
        files.map(file => this.saveFile(file, userId))
      );
      return savedFiles;
    } catch (error) {
      console.error('Error saving multiple files:', error);
      throw error;
    }
  }

  /**
   * Get all unallocated files for a user
   */
  async getUnallocatedFiles(userId: string): Promise<any[]> {
    try {
      return await File.findAll({
        where: {
          userId,
          isAllocated: false
        },
        order: [['createdAt', 'DESC']]
      });
    } catch (error) {
      console.error('Error getting unallocated files:', error);
      throw error;
    }
  }

  /**
   * Mark files as unallocated (when saved without creating a record)
   */
  async markAsUnallocated(fileIds: string[], userId: string): Promise<boolean> {
    try {
      await File.update(
        { isAllocated: false },
        {
          where: {
            id: fileIds,
            userId
          }
        }
      );
      
      return true;
    } catch (error) {
      console.error('Error marking files as unallocated:', error);
      throw error;
    }
  }

  /**
   * Associate files with a record
   */
  async associateFilesWithRecord(fileIds: string[], recordId: string): Promise<any> {
    try {
      // Create entries in the join table
      const recordFiles = fileIds.map(fileId => ({
        id: uuidv4(),
        recordId,
        fileId
      }));
      
      await RecordFile.bulkCreate(recordFiles);
      
      // Mark files as allocated
      await File.update(
        { isAllocated: true },
        {
          where: {
            id: fileIds
          }
        }
      );
      
      return { success: true, count: fileIds.length };
    } catch (error) {
      console.error('Error associating files with record:', error);
      throw error;
    }
  }

  /**
   * Extract text and fields from a PDF file using OCR/text extraction
   */
  async extractFields(fileId: string, userId: string): Promise<any> {
    try {
      // Get the file
      const file = await File.findOne({
        where: { id: fileId, userId }
      });
      
      if (!file) {
        throw new Error('File not found');
      }
      
      // In a real implementation, you would use a PDF extraction library here
      // For demonstration purposes, we'll return some mock extracted fields
      // This would be replaced with actual extraction logic based on your requirements
      
      // Mock extracted fields
      const extractedFields = [
        { name: 'Invoice Number', value: 'INV-12345' },
        { name: 'Date', value: new Date().toISOString().split('T')[0] },
        { name: 'Customer Name', value: 'ACME Corporation' },
        { name: 'Amount', value: '$1,234.56' },
        { name: 'Due Date', value: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0] }
      ];
      
      return { extractedFields, fileId };
    } catch (error) {
      console.error('Error extracting fields:', error);
      throw error;
    }
  }

  /**
   * Get file by ID
   */
  async getFileById(fileId: string, userId: string): Promise<any> {
    try {
      return await File.findOne({
        where: { id: fileId, userId }
      });
    } catch (error) {
      console.error('Error getting file by ID:', error);
      throw error;
    }
  }

  /**
   * Delete file by ID
   */
  async deleteFile(fileId: string, userId: string): Promise<boolean> {
    try {
      const file = await File.findOne({
        where: { id: fileId, userId }
      });
      
      if (!file) {
        throw new Error('File not found');
      }
      
      // Delete from database
      await file.destroy();
      
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }
}

export default new FileService();