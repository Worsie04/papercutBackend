import { Request, Response } from 'express';
import { RecordService } from '../../services/record.service';
import { RecordStatus } from '../../models/record.model';
import { AppError } from '../middlewares/errorHandler';

export class RecordController {
  static async createRecord(req: Request, res: Response) {
    try {
      const { title, cabinetId, customFields, status, isTemplate, isActive, tags } = req.body;
      const creatorId = req.user?.id;

      if (!creatorId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!title) {
        return res.status(400).json({ error: 'Title is required' });
      }

      const record = await RecordService.createRecord({
        title,
        cabinetId,
        creatorId,
        customFields,
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

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const record = await RecordService.updateRecord(id, req.body, userId);
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
      await RecordService.deleteRecord(id);
      res.json({ message: 'Record deleted successfully' });
    } catch (error) {
      console.error('Error deleting record:', error);
      if (error instanceof AppError && error.name === 'NotFoundError') {
        res.status(404).json({ error: error.message });
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
} 