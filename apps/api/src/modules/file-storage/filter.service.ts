import { Injectable, Logger } from '@nestjs/common';

export interface FilterCriteria {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'endsWith' | 'in' | 'notIn' | 'between' | 'exists';
  value: any;
  caseSensitive?: boolean;
}

export interface SortCriteria {
  field: string;
  direction: 'asc' | 'desc';
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface FilterOptions {
  filters?: FilterCriteria[];
  sort?: SortCriteria[];
  pagination?: PaginationOptions;
}

export interface FilteredResults<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  filterStats?: {
    appliedFilters: number;
    filteredOut: number;
    processingTime: number;
  };
}

@Injectable()
export class FilterService {
  private readonly logger = new Logger(FilterService.name);

  applyFilters<T>(data: T[], options: FilterOptions = {}): FilteredResults<T> {
    const startTime = Date.now();
    const originalCount = data.length;
    let filteredData = [...data];

    // Apply filters
    let appliedFilters = 0;
    if (options.filters && options.filters.length > 0) {
      filteredData = this.filterData(filteredData, options.filters);
      appliedFilters = options.filters.length;
    }

    // Apply sorting
    if (options.sort && options.sort.length > 0) {
      filteredData = this.sortData(filteredData, options.sort);
    }

    const total = filteredData.length;

    // Apply pagination
    let paginatedData = filteredData;
    let page = 1;
    let limit = total;
    let totalPages = 1;

    if (options.pagination) {
      page = Math.max(1, options.pagination.page);
      limit = Math.max(1, options.pagination.limit);
      totalPages = Math.ceil(total / limit);
      
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      paginatedData = filteredData.slice(startIndex, endIndex);
    }

    const processingTime = Date.now() - startTime;

    return {
      data: paginatedData,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
      filterStats: {
        appliedFilters,
        filteredOut: originalCount - total,
        processingTime
      }
    };
  }

  private filterData<T>(data: T[], filters: FilterCriteria[]): T[] {
    return data.filter(item => {
      return filters.every(filter => this.evaluateFilter(item, filter));
    });
  }

  private evaluateFilter<T>(item: T, filter: FilterCriteria): boolean {
    const fieldValue = this.getNestedValue(item, filter.field);
    const filterValue = filter.value;
    const caseSensitive = filter.caseSensitive !== false;

    // Handle null/undefined values
    if (fieldValue === null || fieldValue === undefined) {
      return filter.operator === 'exists' ? false : filter.operator === 'ne';
    }

    switch (filter.operator) {
      case 'eq':
        return this.compareValues(fieldValue, filterValue, caseSensitive) === 0;
      
      case 'ne':
        return this.compareValues(fieldValue, filterValue, caseSensitive) !== 0;
      
      case 'gt':
        return this.compareValues(fieldValue, filterValue, caseSensitive) > 0;
      
      case 'gte':
        return this.compareValues(fieldValue, filterValue, caseSensitive) >= 0;
      
      case 'lt':
        return this.compareValues(fieldValue, filterValue, caseSensitive) < 0;
      
      case 'lte':
        return this.compareValues(fieldValue, filterValue, caseSensitive) <= 0;
      
      case 'contains':
        const fieldStr = String(fieldValue);
        const filterStr = String(filterValue);
        return caseSensitive 
          ? fieldStr.includes(filterStr)
          : fieldStr.toLowerCase().includes(filterStr.toLowerCase());
      
      case 'startsWith':
        const fieldStartStr = String(fieldValue);
        const filterStartStr = String(filterValue);
        return caseSensitive
          ? fieldStartStr.startsWith(filterStartStr)
          : fieldStartStr.toLowerCase().startsWith(filterStartStr.toLowerCase());
      
      case 'endsWith':
        const fieldEndStr = String(fieldValue);
        const filterEndStr = String(filterValue);
        return caseSensitive
          ? fieldEndStr.endsWith(filterEndStr)
          : fieldEndStr.toLowerCase().endsWith(filterEndStr.toLowerCase());
      
      case 'in':
        if (!Array.isArray(filterValue)) {
          return false;
        }
        return filterValue.some(val => this.compareValues(fieldValue, val, caseSensitive) === 0);
      
      case 'notIn':
        if (!Array.isArray(filterValue)) {
          return true;
        }
        return !filterValue.some(val => this.compareValues(fieldValue, val, caseSensitive) === 0);
      
      case 'between':
        if (!Array.isArray(filterValue) || filterValue.length !== 2) {
          return false;
        }
        const [min, max] = filterValue;
        return this.compareValues(fieldValue, min, caseSensitive) >= 0 && 
               this.compareValues(fieldValue, max, caseSensitive) <= 0;
      
      case 'exists':
        return fieldValue !== null && fieldValue !== undefined;
      
      default:
        this.logger.warn(`Unknown filter operator: ${filter.operator}`);
        return true;
    }
  }

  private compareValues(a: any, b: any, caseSensitive: boolean): number {
    // Handle dates
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() - b.getTime();
    }
    
    if (a instanceof Date) {
      const bDate = new Date(b);
      return isNaN(bDate.getTime()) ? 1 : a.getTime() - bDate.getTime();
    }
    
    if (b instanceof Date) {
      const aDate = new Date(a);
      return isNaN(aDate.getTime()) ? -1 : aDate.getTime() - b.getTime();
    }

    // Handle numbers
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }
    
    if (typeof a === 'number') {
      const bNum = parseFloat(String(b));
      return isNaN(bNum) ? 1 : a - bNum;
    }
    
    if (typeof b === 'number') {
      const aNum = parseFloat(String(a));
      return isNaN(aNum) ? -1 : aNum - b;
    }

    // Handle strings
    const aStr = String(a);
    const bStr = String(b);
    
    if (caseSensitive) {
      return aStr.localeCompare(bStr);
    } else {
      return aStr.toLowerCase().localeCompare(bStr.toLowerCase());
    }
  }

  private sortData<T>(data: T[], sortCriteria: SortCriteria[]): T[] {
    return data.sort((a, b) => {
      for (const criteria of sortCriteria) {
        const aValue = this.getNestedValue(a, criteria.field);
        const bValue = this.getNestedValue(b, criteria.field);
        
        const comparison = this.compareValues(aValue, bValue, true);
        
        if (comparison !== 0) {
          return criteria.direction === 'desc' ? -comparison : comparison;
        }
      }
      return 0;
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  // Utility methods for common filter patterns
  createDateRangeFilter(field: string, startDate: Date, endDate: Date): FilterCriteria {
    return {
      field,
      operator: 'between',
      value: [startDate, endDate]
    };
  }

  createTextSearchFilter(field: string, searchTerm: string, caseSensitive = false): FilterCriteria {
    return {
      field,
      operator: 'contains',
      value: searchTerm,
      caseSensitive
    };
  }

  createStatusFilter(field: string, statuses: string[]): FilterCriteria {
    return {
      field,
      operator: 'in',
      value: statuses
    };
  }

  createExistsFilter(field: string): FilterCriteria {
    return {
      field,
      operator: 'exists',
      value: true
    };
  }

  // Advanced filtering for specific data types
  filterClients<T extends { name?: string; type?: string; status?: string; portfolioCode?: number }>(
    clients: T[],
    options: {
      name?: string;
      type?: string;
      status?: string;
      portfolioCode?: number;
      pagination?: PaginationOptions;
    } = {}
  ): FilteredResults<T> {
    const filters: FilterCriteria[] = [];

    if (options.name) {
      filters.push(this.createTextSearchFilter('name', options.name));
    }

    if (options.type) {
      filters.push({ field: 'type', operator: 'eq', value: options.type });
    }

    if (options.status) {
      filters.push({ field: 'status', operator: 'eq', value: options.status });
    }

    if (options.portfolioCode) {
      filters.push({ field: 'portfolioCode', operator: 'eq', value: options.portfolioCode });
    }

    return this.applyFilters(clients, {
      filters,
      sort: [{ field: 'name', direction: 'asc' }],
      pagination: options.pagination
    });
  }

  filterTasks<T extends { title?: string; status?: string; priority?: string; dueDate?: Date; assignee?: string }>(
    tasks: T[],
    options: {
      title?: string;
      status?: string;
      priority?: string;
      assignee?: string;
      dueDateRange?: [Date, Date];
      overdue?: boolean;
      pagination?: PaginationOptions;
    } = {}
  ): FilteredResults<T> {
    const filters: FilterCriteria[] = [];

    if (options.title) {
      filters.push(this.createTextSearchFilter('title', options.title));
    }

    if (options.status) {
      filters.push({ field: 'status', operator: 'eq', value: options.status });
    }

    if (options.priority) {
      filters.push({ field: 'priority', operator: 'eq', value: options.priority });
    }

    if (options.assignee) {
      filters.push({ field: 'assignee', operator: 'eq', value: options.assignee });
    }

    if (options.dueDateRange) {
      filters.push(this.createDateRangeFilter('dueDate', options.dueDateRange[0], options.dueDateRange[1]));
    }

    if (options.overdue) {
      filters.push({ field: 'dueDate', operator: 'lt', value: new Date() });
      filters.push({ field: 'status', operator: 'ne', value: 'COMPLETED' });
    }

    return this.applyFilters(tasks, {
      filters,
      sort: [
        { field: 'priority', direction: 'desc' },
        { field: 'dueDate', direction: 'asc' }
      ],
      pagination: options.pagination
    });
  }

  filterServices<T extends { kind?: string; frequency?: string; status?: string; fee?: number; clientId?: string }>(
    services: T[],
    options: {
      kind?: string;
      frequency?: string;
      status?: string;
      clientId?: string;
      minFee?: number;
      maxFee?: number;
      pagination?: PaginationOptions;
    } = {}
  ): FilteredResults<T> {
    const filters: FilterCriteria[] = [];

    if (options.kind) {
      filters.push(this.createTextSearchFilter('kind', options.kind));
    }

    if (options.frequency) {
      filters.push({ field: 'frequency', operator: 'eq', value: options.frequency });
    }

    if (options.status) {
      filters.push({ field: 'status', operator: 'eq', value: options.status });
    }

    if (options.clientId) {
      filters.push({ field: 'clientId', operator: 'eq', value: options.clientId });
    }

    if (options.minFee !== undefined) {
      filters.push({ field: 'fee', operator: 'gte', value: options.minFee });
    }

    if (options.maxFee !== undefined) {
      filters.push({ field: 'fee', operator: 'lte', value: options.maxFee });
    }

    return this.applyFilters(services, {
      filters,
      sort: [
        { field: 'fee', direction: 'desc' },
        { field: 'kind', direction: 'asc' }
      ],
      pagination: options.pagination
    });
  }

  // Advanced filtering methods for large datasets
  createIndexedFilter<T>(data: T[], indexField: string): Map<any, T[]> {
    const index = new Map<any, T[]>();
    
    for (const item of data) {
      const value = this.getNestedValue(item, indexField);
      if (!index.has(value)) {
        index.set(value, []);
      }
      index.get(value)!.push(item);
    }
    
    return index;
  }

  applyIndexedFilter<T>(
    index: Map<any, T[]>, 
    filterValue: any, 
    operator: FilterCriteria['operator'] = 'eq'
  ): T[] {
    const results: T[] = [];
    
    switch (operator) {
      case 'eq':
        return index.get(filterValue) || [];
      
      case 'in':
        if (Array.isArray(filterValue)) {
          for (const value of filterValue) {
            const items = index.get(value) || [];
            results.push(...items);
          }
        }
        break;
      
      case 'ne':
        for (const [key, items] of index.entries()) {
          if (key !== filterValue) {
            results.push(...items);
          }
        }
        break;
      
      default:
        // Fall back to regular filtering for complex operators
        const allItems: T[] = [];
        for (const items of index.values()) {
          allItems.push(...items);
        }
        return allItems;
    }
    
    return results;
  }

  // Batch filtering for very large datasets
  applyFiltersInBatches<T>(
    data: T[], 
    options: FilterOptions = {}, 
    batchSize: number = 1000
  ): FilteredResults<T> {
    if (data.length <= batchSize) {
      return this.applyFilters(data, options);
    }

    const startTime = Date.now();
    let filteredResults: T[] = [];
    let totalProcessed = 0;

    // Process in batches
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const batchResult = this.applyFilters(batch, {
        filters: options.filters,
        sort: options.sort
        // Don't apply pagination to batches
      });
      
      filteredResults.push(...batchResult.data);
      totalProcessed += batch.length;
    }

    // Apply final sorting if needed
    if (options.sort && options.sort.length > 0) {
      filteredResults = this.sortData(filteredResults, options.sort);
    }

    const total = filteredResults.length;

    // Apply pagination to final results
    let paginatedData = filteredResults;
    let page = 1;
    let limit = total;
    let totalPages = 1;

    if (options.pagination) {
      page = Math.max(1, options.pagination.page);
      limit = Math.max(1, options.pagination.limit);
      totalPages = Math.ceil(total / limit);
      
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      paginatedData = filteredResults.slice(startIndex, endIndex);
    }

    const processingTime = Date.now() - startTime;

    return {
      data: paginatedData,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
      filterStats: {
        appliedFilters: options.filters?.length || 0,
        filteredOut: data.length - total,
        processingTime
      }
    };
  }

  // Performance monitoring
  getFilterPerformanceStats(): {
    averageProcessingTime: number;
    totalFiltersApplied: number;
    largestDatasetProcessed: number;
  } {
    // This would be implemented with actual performance tracking
    // For now, return placeholder values
    return {
      averageProcessingTime: 0,
      totalFiltersApplied: 0,
      largestDatasetProcessed: 0
    };
  }
}