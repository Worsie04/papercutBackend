"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSearchParams = createSearchParams;
// Helper function for creating SearchParams with defaults
function createSearchParams(params) {
    return Object.assign({ query: '', options: Object.assign({ strictMatch: false, tolerance: 2, allowedTolerance: true, searchInsideRecords: false, hasFile: false, searchField: true }, params.options), scope: 'all', criteria: {}, dateRanges: {} }, params);
}
