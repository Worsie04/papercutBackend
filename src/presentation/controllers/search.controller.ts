import { Request, Response, NextFunction } from 'express';
import { searchService } from '../../services/search.service';

export class SearchController {
  static async searchRecords(req: Request, res: Response, next: NextFunction) {
    try {
      const { query: q, type, criteria , dateRanges, options} = req.body;
      const results = await searchService.advancedSearch(q, type, criteria, dateRanges, options);
      res.json(results);
    } catch (error) {
      console.error('Error in searchController:', error);
      res.status(500).json({ error: 'Internal Server Error' });
      next(error);
    }
  }
}
