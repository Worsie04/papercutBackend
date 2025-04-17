"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchService = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = __importDefault(require("sequelize"));
const models_1 = require("../models");
class searchService {
    static async searchRecords(query, criteria, dateRanges, options) {
        const conditions = [];
        // Query şərti
        if (query) {
            if (options === null || options === void 0 ? void 0 : options.strictMatch) {
                // Strict match: tam uyğunluq (case-insensitive)
                conditions.push({
                    [sequelize_1.Op.or]: [
                        { title: query },
                        { description: query }
                    ]
                });
            }
            else {
                // Non-strict: LIKE axtarışı
                conditions.push({
                    [sequelize_1.Op.or]: [
                        { title: { [sequelize_1.Op.iLike]: `%${query}%` } },
                        { description: { [sequelize_1.Op.iLike]: `%${query}%` } }
                    ]
                });
            }
            // Əgər "Search inside the records" seçilibsə, əlavə "content" sahəsində axtarış (fərz edirik ki, mövcuddur)
            if (options === null || options === void 0 ? void 0 : options.searchInsideRecords) {
                conditions.push({
                    title: { [sequelize_1.Op.iLike]: `%${query}%` }
                });
            }
            if (options === null || options === void 0 ? void 0 : options.searchField) {
                // Sequelize.literal istifadə edərək custom_fields sütununu text kimi cast edib substring axtarırıq
                conditions.push(sequelize_2.default.literal(`custom_fields::text ILIKE '%${query}%'`));
            }
        }
        // Filter criteria (digər sahələr)
        if (criteria) {
            if (criteria.recordType) {
                conditions.push({ recordType: criteria.recordType });
            }
            if (criteria.creatorId) {
                conditions.push({ creatorId: criteria.creatorId });
            }
            if (criteria.cabinetId) {
                conditions.push({ cabinetId: criteria.cabinetId });
            }
            if (criteria.company) {
                conditions.push({ company: criteria.company });
            }
            if (criteria.tags) {
                const tagsArray = Array.isArray(criteria.tags) ? criteria.tags : [criteria.tags];
                conditions.push({ tags: { [sequelize_1.Op.contains]: tagsArray } });
            }
            // Əgər customField filter varsa (əgər criteria.customField varsa)
            if (criteria.customField) {
                conditions.push((0, sequelize_1.where)((0, sequelize_1.cast)((0, sequelize_1.col)('custom_fields'), 'text'), { [sequelize_1.Op.iLike]: `%${criteria.customField}%` }));
            }
        }
        // "Has File" seçimi: record-lərin fileCount > 0 olması
        if (options === null || options === void 0 ? void 0 : options.hasFile) {
            conditions.push((0, sequelize_1.where)((0, sequelize_1.cast)((0, sequelize_1.col)('custom_fields'), 'text'), { [sequelize_1.Op.iLike]: '%"type":"Attachment"%' }));
        }
        // Date filterləri
        if (dateRanges) {
            for (const field in dateRanges) {
                const range = dateRanges[field];
                if (range.startDate) {
                    conditions.push({ [field]: { [sequelize_1.Op.gte]: range.startDate } });
                }
                if (range.endDate) {
                    conditions.push({ [field]: { [sequelize_1.Op.lte]: range.endDate } });
                }
            }
        }
        const whereClause = conditions.length > 0 ? { [sequelize_1.Op.and]: conditions } : {};
        const results = await models_1.Record.findAll({ where: whereClause });
        return results;
    }
    // Cabinets üzərində axtarış: criteria və dateRanges daxil olmaqla query axtarışı
    static async searchCabinets(query, criteria, dateRanges, options // options hal-hazırda record üçün əsaslıdır; cabinets üçün də bənzər əlavə şərtlər əlavə edilə bilər
    ) {
        const conditions = [];
        if (query) {
            conditions.push({
                [sequelize_1.Op.or]: [
                    { name: { [sequelize_1.Op.iLike]: `%${query}%` } },
                    { description: { [sequelize_1.Op.iLike]: `%${query}%` } }
                ]
            });
        }
        if (criteria) {
            if (criteria.cabinetId) {
                conditions.push({ id: criteria.cabinetId });
            }
            if (criteria.company) {
                conditions.push({ company: criteria.company });
            }
            if (criteria.tags) {
                const tagsArray = Array.isArray(criteria.tags) ? criteria.tags : [criteria.tags];
                conditions.push({ tags: { [sequelize_1.Op.contains]: tagsArray } });
            }
        }
        if (dateRanges) {
            for (const field in dateRanges) {
                const range = dateRanges[field];
                if (range.startDate) {
                    conditions.push({ [field]: { [sequelize_1.Op.gte]: range.startDate } });
                }
                if (range.endDate) {
                    conditions.push({ [field]: { [sequelize_1.Op.lte]: range.endDate } });
                }
            }
        }
        const whereClause = conditions.length > 0 ? { [sequelize_1.Op.and]: conditions } : {};
        const results = await models_1.Cabinet.findAll({ where: whereClause });
        return results;
    }
    // Spaces üzərində axtarış: criteria və dateRanges daxil olmaqla query axtarışı
    static async searchSpaces(query, criteria, dateRanges, options) {
        const conditions = [];
        if (query) {
            conditions.push({
                [sequelize_1.Op.or]: [
                    { name: { [sequelize_1.Op.iLike]: `%${query}%` } },
                    { description: { [sequelize_1.Op.iLike]: `%${query}%` } }
                ]
            });
        }
        if (criteria) {
            if (criteria.spaceId) {
                conditions.push({ id: criteria.spaceId });
            }
            if (criteria.company) {
                conditions.push({ company: criteria.company });
            }
            if (criteria.tags) {
                const tagsArray = Array.isArray(criteria.tags) ? criteria.tags : [criteria.tags];
                conditions.push({ tags: { [sequelize_1.Op.contains]: tagsArray } });
            }
        }
        if (dateRanges) {
            for (const field in dateRanges) {
                const range = dateRanges[field];
                if (range.startDate) {
                    conditions.push({ [field]: { [sequelize_1.Op.gte]: range.startDate } });
                }
                if (range.endDate) {
                    conditions.push({ [field]: { [sequelize_1.Op.lte]: range.endDate } });
                }
            }
        }
        const whereClause = conditions.length > 0 ? { [sequelize_1.Op.and]: conditions } : {};
        const results = await models_1.Space.findAll({ where: whereClause });
        return results;
    }
    /**
     * Advanced search:
     * @param query Optional search text.
     * @param type Search scope (record, cabinet, space).
     * @param criteria Filter criteria (including customField).
     * @param dateRanges Date filter ranges (e.g., createdAt, approvalDate).
     * @param options Search options (strictMatch, allowedTolerance, searchInsideRecords, hasFile, searchField).
     */
    static async advancedSearch(query, type, criteria, dateRanges, options) {
        let records = [];
        let cabinets = [];
        let spaces = [];
        if (type) {
            switch (type.toLowerCase()) {
                case 'record':
                case 'records':
                    records = await this.searchRecords(query, criteria, dateRanges, options);
                    break;
                case 'cabinet':
                case 'cabinets':
                    cabinets = await this.searchCabinets(query, criteria, dateRanges, options);
                    break;
                case 'space':
                case 'spaces':
                    spaces = await this.searchSpaces(query, criteria, dateRanges, options);
                    break;
                default:
                    records = await this.searchRecords(query, criteria, dateRanges, options);
                    cabinets = await this.searchCabinets(query, criteria, dateRanges, options);
                    spaces = await this.searchSpaces(query, criteria, dateRanges, options);
                    break;
            }
        }
        else {
            records = await this.searchRecords(query, criteria, dateRanges, options);
            cabinets = await this.searchCabinets(query, criteria, dateRanges, options);
            spaces = await this.searchSpaces(query, criteria, dateRanges, options);
        }
        const total = records.length + cabinets.length + spaces.length;
        return { records, cabinets, spaces, total };
    }
}
exports.searchService = searchService;
