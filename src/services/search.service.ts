import { Op, where, cast, col } from 'sequelize';
import Sequelize from 'sequelize';
import { Record as RecordModel , Cabinet, Space} from '../models';
import { SearchCriteria, DateRange, SearchOptions } from '../types/search';

export class searchService {

  static async searchRecords(
    query?: string,
    criteria?: SearchCriteria,
    dateRanges?: Record<string, DateRange>,
    options?: SearchOptions
  ) {
    const conditions = [];

    // Query şərti
    if (query) {
      if (options?.strictMatch) {
        // Strict match: tam uyğunluq (case-insensitive)
        conditions.push({
          [Op.or]: [
            { title: query },
            { description: query }
          ]
        });
      } else {
        // Non-strict: LIKE axtarışı
        conditions.push({
          [Op.or]: [
            { title: { [Op.iLike]: `%${query}%` } },
            { description: { [Op.iLike]: `%${query}%` } }
          ]
        });
      }

      // Əgər "Search inside the records" seçilibsə, əlavə "content" sahəsində axtarış (fərz edirik ki, mövcuddur)
      if (options?.searchInsideRecords) {
        conditions.push({
          title: { [Op.iLike]: `%${query}%` }
        });
      }

      if (options?.searchField) {
        // Sequelize.literal istifadə edərək custom_fields sütununu text kimi cast edib substring axtarırıq
        conditions.push(
          Sequelize.literal(`custom_fields::text ILIKE '%${query}%'`)
        );
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
        conditions.push({ tags: { [Op.contains]: tagsArray } });
      }
      // Əgər customField filter varsa (əgər criteria.customField varsa)
      if ((criteria as any).customField) {
        conditions.push(
          where(cast(col('custom_fields'), 'text'), { [Op.iLike]: `%${(criteria as any).customField}%` })
        );
      }
    }

    // "Has File" seçimi: record-lərin fileCount > 0 olması
    if (options?.hasFile) {
      conditions.push(
        where(cast(col('custom_fields'), 'text'), { [Op.iLike]: '%"type":"Attachment"%' })
      );
    }

    // Date filterləri
    if (dateRanges) {
      for (const field in dateRanges) {
        const range = dateRanges[field];
        if (range.startDate) {
          conditions.push({ [field]: { [Op.gte]: range.startDate } });
        }
        if (range.endDate) {
          conditions.push({ [field]: { [Op.lte]: range.endDate } });
        }
      }
    }

    const whereClause = conditions.length > 0 ? { [Op.and]: conditions } : {};
    const results = await RecordModel.findAll({ where: whereClause });
    return results;
  }

  // Cabinets üzərində axtarış: criteria və dateRanges daxil olmaqla query axtarışı
  static async searchCabinets(
    query?: string,
    criteria?: SearchCriteria,
    dateRanges?: Record<string, DateRange>,
    options?: SearchOptions // options hal-hazırda record üçün əsaslıdır; cabinets üçün də bənzər əlavə şərtlər əlavə edilə bilər
  ) {
    const conditions = [];

    if (query) {
      conditions.push({
        [Op.or]: [
          { name: { [Op.iLike]: `%${query}%` } },
          { description: { [Op.iLike]: `%${query}%` } }
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
        conditions.push({ tags: { [Op.contains]: tagsArray } });
      }
    }

    if (dateRanges) {
      for (const field in dateRanges) {
        const range = dateRanges[field];
        if (range.startDate) {
          conditions.push({ [field]: { [Op.gte]: range.startDate } });
        }
        if (range.endDate) {
          conditions.push({ [field]: { [Op.lte]: range.endDate } });
        }
      }
    }

    const whereClause = conditions.length > 0 ? { [Op.and]: conditions } : {};
    const results = await Cabinet.findAll({ where: whereClause });
    return results;
  }

  // Spaces üzərində axtarış: criteria və dateRanges daxil olmaqla query axtarışı
  static async searchSpaces(
    query?: string,
    criteria?: SearchCriteria,
    dateRanges?: Record<string, DateRange>,
    options?: SearchOptions
  ) {
    const conditions = [];

    if (query) {
      conditions.push({
        [Op.or]: [
          { name: { [Op.iLike]: `%${query}%` } },
          { description: { [Op.iLike]: `%${query}%` } }
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
        conditions.push({ tags: { [Op.contains]: tagsArray } });
      }
    }

    if (dateRanges) {
      for (const field in dateRanges) {
        const range = dateRanges[field];
        if (range.startDate) {
          conditions.push({ [field]: { [Op.gte]: range.startDate } });
        }
        if (range.endDate) {
          conditions.push({ [field]: { [Op.lte]: range.endDate } });
        }
      }
    }

    const whereClause = conditions.length > 0 ? { [Op.and]: conditions } : {};
    const results = await Space.findAll({ where: whereClause });
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
  static async advancedSearch(
    query?: string,
    type?: string,
    criteria?: SearchCriteria,
    dateRanges?: Record<string, DateRange>,
    options?: SearchOptions
  ) {
    let records: RecordModel[] = [];
    let cabinets: Cabinet[] = [];
    let spaces: Space[] = [];

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
    } else {
      records = await this.searchRecords(query, criteria, dateRanges, options);
      cabinets = await this.searchCabinets(query, criteria, dateRanges, options);
      spaces = await this.searchSpaces(query, criteria, dateRanges, options);
    }

    const total = records.length + cabinets.length + spaces.length;
    return { records, cabinets, spaces, total };
  }
}