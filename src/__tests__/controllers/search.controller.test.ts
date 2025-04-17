import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { SearchController } from '../../presentation/controllers/search.controller';
import { searchService } from '../../services/search.service';

jest.mock('../../services/search.service');

const app = express();
app.use(express.json());

app.post('/search', SearchController.searchRecords);

describe('SearchController', () => {
  it('should return search results from searchService', async () => {
    const mockResults = { records: [], cabinets: [], spaces: [], total: 0 };
    (searchService.advancedSearch as jest.Mock).mockResolvedValue(mockResults);

    const response = await request(app)
      .post('/search')
      .send({ query: 'test', type: 'record', criteria: {}, dateRanges: {}, options: {} });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockResults);
  });

  it('should handle errors and return 500 status', async () => {
    (searchService.advancedSearch as jest.Mock).mockRejectedValue(new Error('Search failed'));

    const response = await request(app)
      .post('/search')
      .send({ query: 'test', type: 'record', criteria: {}, dateRanges: {}, options: {} });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Internal Server Error' });
  });
});