# File Storage with Enhanced Indexing and Search

This module provides comprehensive file-based storage with advanced indexing and search capabilities for the MDJ Practice Manager.

## Features

### 1. File-Based Indexing
- **Automatic indexing** of all stored documents
- **Real-time updates** when documents are modified
- **Optimized search indexes** for fast retrieval
- **Background processing** to maintain index health

### 2. Advanced Search Functionality
- **Full-text search** across clients, services, and tasks
- **Fuzzy matching** for typo-tolerant searches
- **Field-specific scoring** for relevance ranking
- **Portfolio-based filtering** for multi-tenant support

### 3. Efficient Filtering and Pagination
- **Complex filtering** with multiple operators
- **Batch processing** for large datasets
- **Performance monitoring** and optimization
- **Indexed filtering** for improved speed

## Services

### FileStorageService
Core file operations with JSON-based storage:
```typescript
// Write data with automatic indexing
await fileStorageService.writeJson('clients', 'client-1', clientData, portfolioCode);

// Bulk operations for better performance
const results = await fileStorageService.bulkReadJson('clients', ['client-1', 'client-2']);

// Search with indexing support
const searchResults = await fileStorageService.searchWithIndex('clients', 'ABC Company', {
  portfolioCode: 1,
  limit: 20,
  useIndex: true
});
```

### SearchService
Full-text search with intelligent indexing:
```typescript
// Search across multiple categories
const results = await searchService.search('annual accounts', {
  categories: ['clients', 'tasks', 'services'],
  portfolioCode: 1,
  fuzzy: true,
  limit: 50
});

// Rebuild indexes for better performance
await searchService.rebuildIndex('clients');

// Get search statistics
const stats = await searchService.getSearchStats();
```

### FilterService
Advanced filtering with performance optimization:
```typescript
// Apply complex filters
const filtered = filterService.applyFilters(data, {
  filters: [
    { field: 'status', operator: 'eq', value: 'ACTIVE' },
    { field: 'fee', operator: 'between', value: [100, 1000] },
    { field: 'name', operator: 'contains', value: 'company' }
  ],
  sort: [{ field: 'fee', direction: 'desc' }],
  pagination: { page: 1, limit: 20 }
});

// Batch processing for large datasets
const batchResults = filterService.applyFiltersInBatches(largeDataset, options, 1000);
```

### IndexingService
Unified search and filtering with maintenance:
```typescript
// Combined search with filters
const results = await indexingService.combinedSearch('ABC Company', {
  categories: ['clients'],
  filters: [{ field: 'status', operator: 'eq', value: 'ACTIVE' }],
  portfolioCode: 1,
  limit: 20
});

// Specialized searches
const clients = await indexingService.searchClients('company', {
  status: 'ACTIVE',
  type: 'COMPANY',
  portfolioCode: 1
});

const tasks = await indexingService.searchTasks('accounts', {
  status: 'OPEN',
  priority: 'HIGH',
  overdue: true
});

// Maintenance operations
await indexingService.performMaintenance();
const health = await indexingService.checkIndexHealth();
```

## Data Structure

The file storage follows a structured hierarchy:
```
mdj-data/
├── clients/
│   ├── portfolio-1/
│   │   ├── 1A001.json
│   │   └── 1A002.json
│   └── portfolio-2/
├── services/
│   ├── S001.json
│   └── index.json
├── tasks/
│   ├── T001.json
│   └── index.json
├── indexes/
│   ├── clients.json
│   └── search/
│       ├── clients_search.json
│       └── tasks_search.json
└── snapshots/
    └── latest.json
```

## Performance Features

### Indexing Optimizations
- **Incremental indexing** - Only update changed documents
- **Background processing** - Non-blocking index updates
- **Index optimization** - Remove low-value terms
- **Health monitoring** - Automatic corruption detection

### Search Optimizations
- **Term extraction** with stop-word filtering
- **Fuzzy matching** with Levenshtein distance
- **Field scoring** with importance weighting
- **Result caching** for repeated queries

### Filtering Optimizations
- **Indexed filtering** for common fields
- **Batch processing** for large datasets
- **Performance monitoring** with timing metrics
- **Memory-efficient pagination**

## Usage Examples

### Basic Client Search
```typescript
// Search for clients containing "ABC"
const results = await indexingService.searchClients('ABC', {
  portfolioCode: 1,
  status: 'ACTIVE',
  limit: 10
});

console.log(`Found ${results.total} clients`);
results.results.forEach(result => {
  console.log(`${result.data.name} (${result.data.ref})`);
});
```

### Advanced Task Filtering
```typescript
// Find overdue high-priority tasks
const overdueTasks = await indexingService.searchTasks('', {
  priority: 'HIGH',
  overdue: true,
  limit: 20
});

console.log(`${overdueTasks.total} overdue high-priority tasks found`);
```

### Performance Monitoring
```typescript
// Check system health
const health = await indexingService.checkIndexHealth();
for (const [category, info] of Object.entries(health)) {
  console.log(`${category}: ${info.status}`);
  if (info.issues.length > 0) {
    console.log(`Issues: ${info.issues.join(', ')}`);
    console.log(`Recommendations: ${info.recommendations.join(', ')}`);
  }
}

// Get performance statistics
const stats = await indexingService.getIndexingStats();
console.log(`Total documents: ${stats.totalDocuments}`);
console.log(`Total terms: ${stats.totalTerms}`);
```

## Maintenance

### Regular Maintenance Tasks
```typescript
// Perform full maintenance (recommended weekly)
await indexingService.performMaintenance();

// Rebuild specific indexes if needed
await indexingService.rebuildAllIndexes({
  categories: ['clients', 'tasks']
});

// Optimize indexes for better performance
await indexingService.optimizeAllIndexes();
```

### Health Monitoring
The system provides comprehensive health monitoring:
- **Index integrity** - Detects corrupted indexes
- **Staleness detection** - Identifies outdated indexes
- **Performance metrics** - Tracks search and filter performance
- **Automatic recovery** - Rebuilds corrupted indexes

## Error Handling

All services include comprehensive error handling:
- **Graceful degradation** - Falls back to file-based search if indexes fail
- **Automatic retry** - Retries failed operations with backoff
- **Logging** - Detailed error logging for debugging
- **Recovery** - Automatic index rebuilding on corruption

## Configuration

The system can be configured through environment variables:
- `STORAGE_PATH` - Base path for file storage (default: ../../storage)
- `INDEX_BATCH_SIZE` - Batch size for index processing (default: 100)
- `SEARCH_CACHE_TTL` - Search result cache TTL in seconds (default: 300)

## Requirements Fulfilled

This implementation fulfills the task requirements:

✅ **File-based indexing for efficient data retrieval**
- Comprehensive search indexes stored as JSON files
- Real-time index updates with background processing
- Index optimization and health monitoring

✅ **Search functionality across clients, services, and tasks**
- Full-text search with fuzzy matching
- Category-specific search methods
- Portfolio-based filtering support

✅ **Filtering and pagination for large datasets**
- Advanced filtering with multiple operators
- Batch processing for performance
- Efficient pagination with performance metrics

The system provides a robust, scalable solution for managing large datasets with native file storage while maintaining excellent search and filtering performance.