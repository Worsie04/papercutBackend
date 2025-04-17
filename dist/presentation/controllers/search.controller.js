"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchController = void 0;
const search_service_1 = require("../../services/search.service");
class SearchController {
    static async searchRecords(req, res, next) {
        try {
            const { query: q, type, criteria, dateRanges, options } = req.body;
            const results = await search_service_1.searchService.advancedSearch(q, type, criteria, dateRanges, options);
            res.json(results);
        }
        catch (error) {
            console.error('Error in searchController:', error);
            res.status(500).json({ error: 'Internal Server Error' });
            next(error);
        }
    }
}
exports.SearchController = SearchController;
