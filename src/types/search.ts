// types/search.ts
export interface SearchOptions {
    strictMatch: boolean;
    tolerance: number;
    allowedTolerance: boolean;
    searchInsideRecords: boolean;
    hasFile: boolean;
    searchField: boolean;
  }
  
  export interface DateRange {
    startDate: Date | null;
    endDate: Date | null;
  }
  
  export interface SearchCriteria {
    recordType?: string;
    creatorId?: string;
    cabinetId?: string;
    spaceId?: string;
    company?: string;
    tags?: string | string[];
    customField?: string;
  }
  
  export interface SearchParams {
    query?: string;
    options: SearchOptions;
    scope?: 'all' | 'record' | 'cabinet' | 'space';
    criteria?: SearchCriteria;
    dateRanges?: Record<string, DateRange>;
  }
  
  // Helper function for creating SearchParams with defaults
  export function createSearchParams(params: Partial<SearchParams>): SearchParams {
    return {
      query: '',
      options: {
        strictMatch: false,
        tolerance: 2,
        allowedTolerance: true,
        searchInsideRecords: false,
        hasFile: false,
        searchField: true,
        ...params.options
      },
      scope: 'all',
      criteria: {},
      dateRanges: {},
      ...params
    };
  }