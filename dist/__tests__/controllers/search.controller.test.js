"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const search_controller_1 = require("../../presentation/controllers/search.controller");
const search_service_1 = require("../../services/search.service");
jest.mock('../../services/search.service');
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.post('/search', search_controller_1.SearchController.searchRecords);
describe('SearchController', () => {
    it('should return search results from searchService', async () => {
        const mockResults = { records: [], cabinets: [], spaces: [], total: 0 };
        search_service_1.searchService.advancedSearch.mockResolvedValue(mockResults);
        const response = await (0, supertest_1.default)(app)
            .post('/search')
            .send({ query: 'test', type: 'record', criteria: {}, dateRanges: {}, options: {} });
        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockResults);
    });
    it('should handle errors and return 500 status', async () => {
        search_service_1.searchService.advancedSearch.mockRejectedValue(new Error('Search failed'));
        const response = await (0, supertest_1.default)(app)
            .post('/search')
            .send({ query: 'test', type: 'record', criteria: {}, dateRanges: {}, options: {} });
        expect(response.status).toBe(500);
        expect(response.body).toEqual({ error: 'Internal Server Error' });
    });
});
