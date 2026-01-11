import { Test, TestingModule } from '@nestjs/testing';
import { FilterService, FilterCriteria, SortCriteria, PaginationOptions } from './filter.service';

describe('FilterService', () => {
  let service: FilterService;

  const mockData = [
    { id: 1, name: 'Alice Johnson', age: 30, status: 'active', score: 85.5, createdAt: new Date('2023-01-15') },
    { id: 2, name: 'Bob Smith', age: 25, status: 'inactive', score: 92.0, createdAt: new Date('2023-02-20') },
    { id: 3, name: 'Charlie Brown', age: 35, status: 'active', score: 78.3, createdAt: new Date('2023-01-10') },
    { id: 4, name: 'Diana Prince', age: 28, status: 'pending', score: 88.7, createdAt: new Date('2023-03-05') },
    { id: 5, name: 'Eve Wilson', age: 32, status: 'active', score: 95.2, createdAt: new Date('2023-02-28') }
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FilterService],
    }).compile();

    service = module.get<FilterService>(FilterService);
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('basic filtering', () => {
    it('should filter by equality', () => {
      const filters: FilterCriteria[] = [
        { field: 'status', operator: 'eq', value: 'active' }
      ];

      const result = service.applyFilters(mockData, { filters });

      expect(result.data).toHaveLength(3);
      expect(result.data.every(item => item.status === 'active')).toBe(true);
    });

    it('should filter by inequality', () => {
      const filters: FilterCriteria[] = [
        { field: 'status', operator: 'ne', value: 'active' }
      ];

      const result = service.applyFilters(mockData, { filters });

      expect(result.data).toHaveLength(2);
      expect(result.data.every(item => item.status !== 'active')).toBe(true);
    });

    it('should filter by greater than', () => {
      const filters: FilterCriteria[] = [
        { field: 'age', operator: 'gt', value: 30 }
      ];

      const result = service.applyFilters(mockData, { filters });

      expect(result.data).toHaveLength(2);
      expect(result.data.every(item => item.age > 30)).toBe(true);
    });

    it('should filter by greater than or equal', () => {
      const filters: FilterCriteria[] = [
        { field: 'age', operator: 'gte', value: 30 }
      ];

      const result = service.applyFilters(mockData, { filters });

      expect(result.data).toHaveLength(3);
      expect(result.data.every(item => item.age >= 30)).toBe(true);
    });

    it('should filter by less than', () => {
      const filters: FilterCriteria[] = [
        { field: 'age', operator: 'lt', value: 30 }
      ];

      const result = service.applyFilters(mockData, { filters });

      expect(result.data).toHaveLength(2);
      expect(result.data.every(item => item.age < 30)).toBe(true);
    });

    it('should filter by less than or equal', () => {
      const filters: FilterCriteria[] = [
        { field: 'age', operator: 'lte', value: 30 }
      ];

      const result = service.applyFilters(mockData, { filters });

      expect(result.data).toHaveLength(3);
      expect(result.data.every(item => item.age <= 30)).toBe(true);
    });
  });

  describe('string filtering', () => {
    it('should filter by contains (case insensitive)', () => {
      const filters: FilterCriteria[] = [
        { field: 'name', operator: 'contains', value: 'john', caseSensitive: false }
      ];

      const result = service.applyFilters(mockData, { filters });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Alice Johnson');
    });

    it('should filter by contains (case sensitive)', () => {
      const filters: FilterCriteria[] = [
        { field: 'name', operator: 'contains', value: 'John', caseSensitive: true }
      ];

      const result = service.applyFilters(mockData, { filters });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Alice Johnson');
    });

    it('should filter by startsWith', () => {
      const filters: FilterCriteria[] = [
        { field: 'name', operator: 'startsWith', value: 'Bob' }
      ];

      const result = service.applyFilters(mockData, { filters });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Bob Smith');
    });

    it('should filter by endsWith', () => {
      const filters: FilterCriteria[] = [
        { field: 'name', operator: 'endsWith', value: 'Smith' }
      ];

      const result = service.applyFilters(mockData, { filters });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Bob Smith');
    });
  });

  describe('array filtering', () => {
    it('should filter by in operator', () => {
      const filters: FilterCriteria[] = [
        { field: 'status', operator: 'in', value: ['active', 'pending'] }
      ];

      const result = service.applyFilters(mockData, { filters });

      expect(result.data).toHaveLength(4);
      expect(result.data.every(item => ['active', 'pending'].includes(item.status))).toBe(true);
    });

    it('should filter by notIn operator', () => {
      const filters: FilterCriteria[] = [
        { field: 'status', operator: 'notIn', value: ['active', 'pending'] }
      ];

      const result = service.applyFilters(mockData, { filters });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe('inactive');
    });

    it('should handle invalid array values for in operator', () => {
      const filters: FilterCriteria[] = [
        { field: 'status', operator: 'in', value: 'not-an-array' }
      ];

      const result = service.applyFilters(mockData, { filters });

      expect(result.data).toHaveLength(0);
    });
  });

  describe('range filtering', () => {
    it('should filter by between operator', () => {
      const filters: FilterCriteria[] = [
        { field: 'age', operator: 'between', value: [25, 30] }
      ];

      const result = service.applyFilters(mockData, { filters });

      expect(result.data).toHaveLength(3);
      expect(result.data.every(item => item.age >= 25 && item.age <= 30)).toBe(true);
    });

    it('should handle invalid range values for between operator', () => {
      const filters: FilterCriteria[] = [
        { field: 'age', operator: 'between', value: [25] }
      ];

      const result = service.applyFilters(mockData, { filters });

      expect(result.data).toHaveLength(0);
    });
  });

  describe('existence filtering', () => {
    const dataWithNulls = [
      ...mockData,
      { id: 6, name: null, age: 40, status: 'active', score: null, createdAt: new Date() }
    ];

    it('should filter by exists operator', () => {
      const filters: FilterCriteria[] = [
        { field: 'name', operator: 'exists', value: true }
      ];

      const result = service.applyFilters(dataWithNulls, { filters });

      expect(result.data).toHaveLength(5);
      expect(result.data.every(item => item.name !== null && item.name !== undefined)).toBe(true);
    });

    it('should handle null values correctly', () => {
      const filters: FilterCriteria[] = [
        { field: 'score', operator: 'ne', value: null }
      ];

      const result = service.applyFilters(dataWithNulls, { filters });

      expect(result.data).toHaveLength(5);
    });
  });

  describe('multiple filters', () => {
    it('should apply multiple filters with AND logic', () => {
      const filters: FilterCriteria[] = [
        { field: 'status', operator: 'eq', value: 'active' },
        { field: 'age', operator: 'gte', value: 30 }
      ];

      const result = service.applyFilters(mockData, { filters });

      expect(result.data).toHaveLength(2);
      expect(result.data.every(item => item.status === 'active' && item.age >= 30)).toBe(true);
    });
  });

  describe('sorting', () => {
    it('should sort by single field ascending', () => {
      const sort: SortCriteria[] = [
        { field: 'age', direction: 'asc' }
      ];

      const result = service.applyFilters(mockData, { sort });

      expect(result.data[0].age).toBe(25);
      expect(result.data[result.data.length - 1].age).toBe(35);
    });

    it('should sort by single field descending', () => {
      const sort: SortCriteria[] = [
        { field: 'age', direction: 'desc' }
      ];

      const result = service.applyFilters(mockData, { sort });

      expect(result.data[0].age).toBe(35);
      expect(result.data[result.data.length - 1].age).toBe(25);
    });

    it('should sort by multiple fields', () => {
      const sort: SortCriteria[] = [
        { field: 'status', direction: 'asc' },
        { field: 'age', direction: 'desc' }
      ];

      const result = service.applyFilters(mockData, { sort });

      // Should sort by status first, then by age descending within each status
      const activeItems = result.data.filter(item => item.status === 'active');
      expect(activeItems[0].age).toBeGreaterThanOrEqual(activeItems[1].age);
    });

    it('should sort dates correctly', () => {
      const sort: SortCriteria[] = [
        { field: 'createdAt', direction: 'asc' }
      ];

      const result = service.applyFilters(mockData, { sort });

      expect(result.data[0].createdAt.getTime()).toBeLessThanOrEqual(result.data[1].createdAt.getTime());
    });

    it('should sort numbers correctly', () => {
      const sort: SortCriteria[] = [
        { field: 'score', direction: 'desc' }
      ];

      const result = service.applyFilters(mockData, { sort });

      expect(result.data[0].score).toBe(95.2);
      expect(result.data[result.data.length - 1].score).toBe(78.3);
    });
  });

  describe('pagination', () => {
    it('should paginate results correctly', () => {
      const pagination: PaginationOptions = {
        page: 1,
        limit: 2
      };

      const result = service.applyFilters(mockData, { pagination });

      expect(result.data).toHaveLength(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
      expect(result.total).toBe(5);
      expect(result.totalPages).toBe(3);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrevious).toBe(false);
    });

    it('should handle second page correctly', () => {
      const pagination: PaginationOptions = {
        page: 2,
        limit: 2
      };

      const result = service.applyFilters(mockData, { pagination });

      expect(result.data).toHaveLength(2);
      expect(result.page).toBe(2);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrevious).toBe(true);
    });

    it('should handle last page correctly', () => {
      const pagination: PaginationOptions = {
        page: 3,
        limit: 2
      };

      const result = service.applyFilters(mockData, { pagination });

      expect(result.data).toHaveLength(1);
      expect(result.page).toBe(3);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrevious).toBe(true);
    });

    it('should handle page beyond available data', () => {
      const pagination: PaginationOptions = {
        page: 10,
        limit: 2
      };

      const result = service.applyFilters(mockData, { pagination });

      expect(result.data).toHaveLength(0);
      expect(result.page).toBe(10);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrevious).toBe(true);
    });
  });

  describe('combined operations', () => {
    it('should apply filters, sorting, and pagination together', () => {
      const filters: FilterCriteria[] = [
        { field: 'status', operator: 'eq', value: 'active' }
      ];
      const sort: SortCriteria[] = [
        { field: 'age', direction: 'desc' }
      ];
      const pagination: PaginationOptions = {
        page: 1,
        limit: 2
      };

      const result = service.applyFilters(mockData, { filters, sort, pagination });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(3); // Total active items
      expect(result.data[0].status).toBe('active');
      expect(result.data[0].age).toBeGreaterThanOrEqual(result.data[1].age);
    });
  });

  describe('nested field access', () => {
    const nestedData = [
      { id: 1, user: { name: 'John', profile: { age: 30 } }, status: 'active' },
      { id: 2, user: { name: 'Jane', profile: { age: 25 } }, status: 'inactive' },
      { id: 3, user: { name: 'Bob', profile: { age: 35 } }, status: 'active' }
    ];

    it('should filter by nested field', () => {
      const filters: FilterCriteria[] = [
        { field: 'user.name', operator: 'eq', value: 'John' }
      ];

      const result = service.applyFilters(nestedData, { filters });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].user.name).toBe('John');
    });

    it('should sort by deeply nested field', () => {
      const sort: SortCriteria[] = [
        { field: 'user.profile.age', direction: 'asc' }
      ];

      const result = service.applyFilters(nestedData, { sort });

      expect(result.data[0].user.profile.age).toBe(25);
      expect(result.data[2].user.profile.age).toBe(35);
    });
  });

  describe('utility methods', () => {
    it('should create date range filter', () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-02-01');
      
      const filter = service.createDateRangeFilter('createdAt', startDate, endDate);

      expect(filter.field).toBe('createdAt');
      expect(filter.operator).toBe('between');
      expect(filter.value).toEqual([startDate, endDate]);
    });

    it('should create text search filter', () => {
      const filter = service.createTextSearchFilter('name', 'john', false);

      expect(filter.field).toBe('name');
      expect(filter.operator).toBe('contains');
      expect(filter.value).toBe('john');
      expect(filter.caseSensitive).toBe(false);
    });

    it('should create status filter', () => {
      const statuses = ['active', 'pending'];
      const filter = service.createStatusFilter('status', statuses);

      expect(filter.field).toBe('status');
      expect(filter.operator).toBe('in');
      expect(filter.value).toEqual(statuses);
    });

    it('should create exists filter', () => {
      const filter = service.createExistsFilter('email');

      expect(filter.field).toBe('email');
      expect(filter.operator).toBe('exists');
      expect(filter.value).toBe(true);
    });
  });

  describe('specialized filtering methods', () => {
    const mockClients = [
      { name: 'ABC Company', type: 'COMPANY', status: 'ACTIVE', portfolioCode: 1 },
      { name: 'XYZ Partnership', type: 'PARTNERSHIP', status: 'ACTIVE', portfolioCode: 2 },
      { name: 'John Smith', type: 'INDIVIDUAL', status: 'INACTIVE', portfolioCode: 1 }
    ];

    it('should filter clients correctly', () => {
      const result = service.filterClients(mockClients, {
        name: 'ABC',
        status: 'ACTIVE',
        portfolioCode: 1
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('ABC Company');
    });

    const mockTasks = [
      { title: 'Annual Accounts', status: 'OPEN', priority: 'HIGH', dueDate: new Date('2023-12-31'), assignee: 'john' },
      { title: 'VAT Return', status: 'IN_PROGRESS', priority: 'MEDIUM', dueDate: new Date('2023-11-30'), assignee: 'jane' },
      { title: 'Tax Return', status: 'COMPLETED', priority: 'LOW', dueDate: new Date('2023-10-31'), assignee: 'john' }
    ];

    it('should filter tasks correctly', () => {
      const result = service.filterTasks(mockTasks, {
        assignee: 'john',
        status: 'OPEN'
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('Annual Accounts');
    });

    it('should filter overdue tasks', () => {
      const result = service.filterTasks(mockTasks, {
        overdue: true
      });

      // This would depend on the current date, but we can check the logic
      expect(result.data.every(task => task.status !== 'COMPLETED')).toBe(true);
    });

    const mockServices = [
      { kind: 'Accounts', frequency: 'ANNUAL', status: 'ACTIVE', fee: 1000, clientId: 'client-1' },
      { kind: 'VAT', frequency: 'QUARTERLY', status: 'ACTIVE', fee: 500, clientId: 'client-2' },
      { kind: 'Payroll', frequency: 'MONTHLY', status: 'INACTIVE', fee: 200, clientId: 'client-1' }
    ];

    it('should filter services correctly', () => {
      const result = service.filterServices(mockServices, {
        clientId: 'client-1',
        minFee: 500
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].kind).toBe('Accounts');
    });
  });

  describe('error handling', () => {
    it('should handle unknown filter operators gracefully', () => {
      const filters: FilterCriteria[] = [
        { field: 'name', operator: 'unknown' as any, value: 'test' }
      ];

      const result = service.applyFilters(mockData, { filters });

      // Should return all data when unknown operator is used
      expect(result.data).toHaveLength(mockData.length);
    });

    it('should handle missing nested fields gracefully', () => {
      const filters: FilterCriteria[] = [
        { field: 'nonexistent.field', operator: 'eq', value: 'test' }
      ];

      const result = service.applyFilters(mockData, { filters });

      expect(result.data).toHaveLength(0);
    });

    it('should handle invalid pagination values', () => {
      const pagination: PaginationOptions = {
        page: -1,
        limit: -5
      };

      const result = service.applyFilters(mockData, { pagination });

      expect(result.page).toBe(1); // Should default to 1
      expect(result.limit).toBe(1); // Should default to 1
    });
  });
});