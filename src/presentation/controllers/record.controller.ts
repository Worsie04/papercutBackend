import { Request, Response } from 'express';
import { RecordService } from '../../services/record.service';
import { RecordStatus } from '../../models/record.model';
import { AppError } from '../middlewares/errorHandler';
import { UploadService } from '../../services/upload.service';
import { Cabinet } from '../../models/cabinet.model';

export class RecordController {
  
  static async createRecord(req: Request, res: Response) {
    try {
      const creatorId = req.user?.id;
      const files = req.files as Express.Multer.File[];
      
      // Parse JSON strings from FormData
      const title = req.body.title;
      const cabinetId = req.body.cabinetId;
      const status = req.body.status;
      const isTemplate = req.body.isTemplate === 'true';
      const isActive = req.body.isActive === 'true';
      const tags = JSON.parse(req.body.tags || '[]');
      const customFields = JSON.parse(req.body.customFields || '{}');

      if (!creatorId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!title) {
        return res.status(400).json({ error: 'Title is required' });
      }

      // Handle file uploads for attachment fields
      const processedCustomFields = { ...customFields };
      if (files && Array.isArray(files)) {
        for (const file of files) {
          const fieldId = file.fieldname; // multer sets this from the FormData field name
          if (file) {
            const uploadResult = await UploadService.uploadFile(file);
            processedCustomFields[fieldId] = {
              fileName: uploadResult.fileName,
              fileSize: uploadResult.fileSize,
              fileType: uploadResult.fileType,
              filePath: uploadResult.filePath,
              fileHash: uploadResult.fileHash,
              pageCount: uploadResult.pageCount
            };
          }
        }
      }

      const record = await RecordService.createRecord({
        title,
        cabinetId,
        creatorId,
        customFields: processedCustomFields,
        status: status as RecordStatus,
        isTemplate,
        isActive,
        tags
      });

      res.status(201).json(record);
    } catch (error) {
      console.error('Error creating record:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to create record' });
      }
    }
  }

  static async getCabinetRecords(req: Request, res: Response) {
    try {
      const { cabinetId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const result = await RecordService.getCabinetRecords(cabinetId, page, limit);
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error getting cabinet records:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to get cabinet records' });
      }
    }
  }

  static async getRecord(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const record = await RecordService.getRecordById(id);
      res.json(record);
    } catch (error) {
      console.error('Error getting record:', error);
      if (error instanceof AppError && error.name === 'NotFoundError') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to get record' });
      }
    }
  }

  static async updateRecord(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const files = req.files as Express.Multer.File[];
      const { customFields, title, note, comments, status } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get existing record to validate
      const existingRecord = await RecordService.getRecordById(id);
      if (!existingRecord) {
        return res.status(404).json({ error: 'Record not found' });
      }

      // Parse customFields if it's a string
      let parsedCustomFields = typeof customFields === 'string' ? JSON.parse(customFields) : customFields;

      // Initialize structuredCustomFields
      const structuredCustomFields: { [key: string]: { fieldId: number; value: any; type: string } } = {};
      
      // Only process customFields if they exist
      if (parsedCustomFields) {
        Object.entries(parsedCustomFields).forEach(([fieldId, fieldValue]) => {
          structuredCustomFields[fieldId] = {
            fieldId: Number(fieldId),
            value: fieldValue,
            type: existingRecord.customFields[fieldId]?.type || 'Text/Number with Special Symbols'
          };
        });

        // Merge with existing custom fields
        parsedCustomFields = {
          ...existingRecord.customFields,
          ...structuredCustomFields
        };
      } else {
        // If no new customFields provided, use existing ones
        parsedCustomFields = existingRecord.customFields;
      }

      console.log('Structured Custom Fields:', JSON.stringify(parsedCustomFields, null, 2));

      // Handle file uploads if any
      if (files && files.length > 0) {
        const fileFields = Array.isArray(req.body.fileFields) 
          ? req.body.fileFields 
          : [req.body.fileFields];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fieldId = fileFields[i];

          // Process the file and get file info
          const fileInfo = await UploadService.uploadFile(file);

          // Update the corresponding field with file information
          if (parsedCustomFields[fieldId]) {
            parsedCustomFields[fieldId] = {
              ...parsedCustomFields[fieldId],
              value: {
                fileName: file.originalname,
                fileSize: file.size,
                fileType: file.mimetype,
                filePath: fileInfo.filePath,
                fileHash: fileInfo.fileHash
              }
            };
          }
        }
      }

      // Find the first attachment field if any (for main record file info)
      let fileInfo = null;
      for (const fieldId in parsedCustomFields) {
        const field = parsedCustomFields[fieldId];
        if (field.type === 'Attachment' && field.value) {
          fileInfo = field.value;
          break;
        }
      }

      const record = await RecordService.updateRecord(id, {
        title,
        customFields: parsedCustomFields,
        note,
        comments,
        lastModifiedBy: userId,
        status: status || existingRecord.status,
        // Add file information if present
        ...(fileInfo && {
          fileName: fileInfo.fileName,
          filePath: fileInfo.filePath,
          fileSize: fileInfo.fileSize,
          fileType: fileInfo.fileType,
          fileHash: fileInfo.fileHash,
        })
      }, userId);

      res.json(record);
    } catch (error) {
      console.error('Error updating record:', error);
      if (error instanceof AppError && error.name === 'NotFoundError') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to update record' });
      }
    }
  }

  static async deleteRecord(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await RecordService.deleteRecord(id, userId);
      res.json({ message: 'Record deleted successfully' });
    } catch (error) {
      console.error('Error deleting record:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to delete record' });
      }
    }
  }

  static async getRecordsByStatus(req: Request, res: Response) {
    try {
      const { status } = req.query;
      const creatorId = req.user?.id;

      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }

      if (!creatorId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Handle comma-separated status values and ensure they're strings
      const statusValues = (typeof status === 'string' ? status.split(',') : [status.toString()])
        .map(s => s.trim())
        .filter(s => s.length > 0);

      // Validate status values
      const validStatuses = Object.values(RecordStatus);
      const invalidStatuses = statusValues.filter(s => !validStatuses.includes(s as RecordStatus));
      if (invalidStatuses.length > 0) {
        return res.status(400).json({ error: `Invalid status values: ${invalidStatuses.join(', ')}` });
      }

      const records = await RecordService.getRecordsByStatus(statusValues, creatorId);
      res.json(records);
    } catch (error) {
      console.error('Error getting records by status:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to get records' });
      }
    }
  }

  static async getFileUrl(req: Request, res: Response) {
    try {
      const { filePath } = req.params;
      const { type } = req.query;

      if (!filePath) {
        return res.status(400).json({ error: 'File path is required' });
      }

      let url;
      if (type === 'view') {
        url = await UploadService.getFileViewUrl(filePath);
      } else {
        url = await UploadService.getFileDownloadUrl(filePath);
      }

      res.json({ url });
    } catch (error) {
      console.error('Error getting file URL:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to get file URL' });
      }
    }
  }

  static async uploadNewVersion(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const file = req.file as Express.Multer.File;
      const { note } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!file) {
        return res.status(400).json({ error: 'File is required' });
      }

      const uploadResult = await UploadService.uploadFile(file);
      const version = await RecordService.createNewVersion(id, {
        ...uploadResult,
        uploadedBy: userId,
        note: note || undefined,
      });

      res.status(201).json(version);
    } catch (error) {
      console.error('Error uploading new version:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to upload new version' });
      }
    }
  }

  static async getVersions(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const versions = await RecordService.getRecordVersions(id);
      res.json(versions);
    } catch (error) {
      console.error('Error getting versions:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to get versions' });
      }
    }
  }

  static async deleteVersion(req: Request, res: Response) {
    try {
      const { id, versionId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await RecordService.deleteVersion(id, versionId, userId);
      res.json({ message: 'Version deleted successfully' });
    } catch (error) {
      console.error('Error deleting version:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to delete version' });
      }
    }
  }

  static async approveRecord(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const files = req.files as Express.Multer.File[];
      const { customFields, title, note, comments } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get existing record to validate
      const existingRecord = await RecordService.getRecordById(id);
      if (!existingRecord) {
        return res.status(404).json({ error: 'Record not found' });
      }

      // Parse customFields if it's a string
      let parsedCustomFields = typeof customFields === 'string' ? JSON.parse(customFields) : customFields;

      // Initialize structuredCustomFields
      const structuredCustomFields: { [key: string]: { fieldId: number; value: any; type: string } } = {};
      
      // Only process customFields if they exist
      if (parsedCustomFields) {
        Object.entries(parsedCustomFields).forEach(([fieldId, fieldValue]) => {
          structuredCustomFields[fieldId] = {
            fieldId: Number(fieldId),
            value: fieldValue,
            type: existingRecord.customFields[fieldId]?.type || 'Text/Number with Special Symbols'
          };
        });

        // Merge with existing custom fields
        parsedCustomFields = {
          ...existingRecord.customFields,
          ...structuredCustomFields
        };
      } else {
        // If no new customFields provided, use existing ones
        parsedCustomFields = existingRecord.customFields;
      }

      // Handle file uploads if any
      if (files && files.length > 0) {
        const fileFields = Array.isArray(req.body.fileFields) 
          ? req.body.fileFields 
          : [req.body.fileFields];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fieldId = fileFields[i];

          // Process the file and get file info
          const fileInfo = await UploadService.uploadFile(file);

          // Update the corresponding field with file information
          if (parsedCustomFields[fieldId]) {
            parsedCustomFields[fieldId] = {
              ...parsedCustomFields[fieldId],
              value: {
                fileName: file.originalname,
                fileSize: file.size,
                fileType: file.mimetype,
                filePath: fileInfo.filePath,
                fileHash: fileInfo.fileHash
              }
            };
          }
        }
      }

      // Find the first attachment field if any (for main record file info)
      let fileInfo = null;
      for (const fieldId in parsedCustomFields) {
        const field = parsedCustomFields[fieldId];
        if (field.type === 'Attachment' && field.value) {
          fileInfo = field.value;
          break;
        }
      }

      // Prepare the update data
      const updateData = {
        title,
        customFields: parsedCustomFields,
        ...(fileInfo && {
          fileName: fileInfo.fileName,
          filePath: fileInfo.filePath,
          fileSize: fileInfo.fileSize,
          fileType: fileInfo.fileType,
          fileHash: fileInfo.fileHash,
        })
      };

      const record = await RecordService.approveRecord(id, userId, note, updateData);
      res.json(record);
    } catch (error) {
      console.error('Error approving record:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to approve record' });
      }
    }
  }

  static async rejectRecord(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const { note, comments } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const record = await RecordService.rejectRecord(id, userId, note, comments);
      res.json(record);
    } catch (error) {
      console.error('Error rejecting record:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to reject record' });
      }
    }
  }
} 