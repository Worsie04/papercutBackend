import { Request, Response } from 'express';
import { ReferenceService } from '../../services/reference.service';

export class ReferenceController {
  static async create(req: Request, res: Response) {
    try {
      const { name, type } = req.body;
      const newRef = await ReferenceService.create({ name, type });
      res.status(201).json(newRef);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getAll(req: Request, res: Response) {
    try {
      const references = await ReferenceService.getAll();
      if (!Array.isArray(references)) {
        console.warn('References is not an array:', references);
        res.json([]);
      } else {
        res.json(references);
      }
    } catch (error: any) {
      console.error('Error in getAll controller:', error);
      res.status(500).json({ error: error.message, references: [] });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updated = await ReferenceService.update(id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await ReferenceService.delete(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
