# Performance Optimization System

A comprehensive performance optimization and caching system for the PDF processing pipeline that provides intelligent caching, resource management, and performance monitoring.

## Features

### 🚀 Multi-Level Caching
- **Text Extraction Cache**: Caches PDF text extraction results (1 hour TTL)
- **AI Results Cache**: Caches AI processing outcomes (30 minutes TTL)
- **Validation Cache**: Caches validation results (10 minutes TTL)
- **Query Results Cache**: Caches database query results (5 minutes TTL)

### 📊 Performance Monitoring
- Real-time performance metrics collection
- Bottleneck identification and alerting
- Memory usage monitoring and optimization
- Cache hit rate analysis and optimization

### 🎯 Adaptive Processing
- PDF complexity analysis for optimal processing strategy
- Dynamic resource allocation based on load
- Priority-based queue management
- Automatic scaling based on system resources

### 🗄️ Database Optimization
- Prepared statements for common queries
- Connection pooling with automatic management
- Query result caching with intelligent invalidation
- Batch operation optimization

## Quick Start

### Basic Usage

```typescript
import { performanceOptimizer } from './optimization/PerformanceOptimizer';

// Initialize with custom configuration (optional)
const optimizer = PerformanceOptimizer.getInstance({
  processing: {
    maxConcurrent: 8,
    memoryThreshold: 0.7
  },
  caching: {
    textExtraction: { maxSize: 200, ttl: 7200000 } // 2 hours
  }
});

// Warm up cache on startup
await optimizer.warmCache();
```

### Integration with PDF Processing

```typescript
import { performanceOptimizer } from './optimization/PerformanceOptimizer';

async function processPDF(pdfUrl: string): Promise<CarListing> {
  // Check cache for text extraction
  let extractedText = await performanceOptimizer.getCachedTextExtraction(pdfUrl);
  
  if (!extractedText) {
    // Extract text and cache result
    extractedText = await extractTextFromPDF(pdfUrl);
    performanceOptimizer.setCachedTextExtraction(pdfUrl, extractedText);
  }
  
  // Check cache for AI processing
  const prompt = 'Extract car information from this text';
  let aiResult = await performanceOptimizer.getCachedAIResult(extractedText, prompt);
  
  if (!aiResult) {
    // Process with AI and cache result
    aiResult = await processWithAI(extractedText, prompt);
    performanceOptimizer.setCachedAIResult(extractedText, prompt, aiResult);
  }
  
  // Validate and cache validation result
  let validationResult = await performanceOptimizer.getCachedValidation(aiResult);
  
  if (!validationResult) {
    validationResult = await validateCarData(aiResult);
    performanceOptimizer.setCachedValidation(aiResult, validationResult);
  }
  
  return validationResult.data;
}
```

### Database Query Optimization

```typescript
// Use optimized queries with automatic caching
const listings = await performanceOptimizer.executeOptimizedQuery(
  'getListingsByMake', 
  ['volkswagen', 20, 0]
);

const specificListing = await performanceOptimizer.executeOptimizedQuery(
  'getListingById',
  ['listing-123']
);

// Search with full-text search optimization
const searchResults = await performanceOptimizer.executeOptimizedQuery(
  'searchListings',
  ['volkswagen golf', 50, 0]
);
```

### Queue Management

```typescript
// Add job to processing queue with automatic priority calculation
await performanceOptimizer.addToProcessingQueue({
  id: 'pdf-job-123',
  created_at: new Date(),
  status: 'pending',
  job_type: 'pdf_processing',
  metadata: { 
    file_size: pdfSize,
    page_count: pageCount,
    user_tier: 'premium'
  },
  retry_count: 0
});
```

### Batch Processing Optimization

```typescript
// Process multiple PDFs with optimized batching
const pdfUrls = ['url1.pdf', 'url2.pdf', 'url3.pdf', ...];

const results = await performanceOptimizer.processBatch(
  pdfUrls,
  async (url) => await processPDF(url),
  {
    batchSize: 5,
    maxConcurrent: 3
  }
);
```

## Configuration Options

### Caching Configuration

```typescript
const config = {
  caching: {
    textExtraction: {
      maxSize: 100,           // Maximum cache entries
      ttl: 3600000,          // 1 hour TTL
      updateAgeOnGet: true   // Update age on access
    },
    aiResults: {
      maxSize: 500,
      ttl: 1800000,          // 30 minutes TTL
      updateAgeOnGet: true
    },
    validation: {
      maxSize: 1000,
      ttl: 600000            // 10 minutes TTL
    },
    queryResults: {
      maxSize: 200,
      ttl: 300000            // 5 minutes TTL
    }
  }
};
```

### Processing Configuration

```typescript
const config = {
  processing: {
    maxConcurrent: 5,        // Max concurrent processing jobs
    chunkSize: 1024 * 1024, // 1MB processing chunks
    memoryThreshold: 0.8,   // Memory usage threshold (80%)
    queuePriority: true     // Enable priority queue
  }
};
```

### Monitoring Configuration

```typescript
const config = {
  monitoring: {
    metricsRetention: 86400000, // 24 hours metrics retention
    alertThresholds: {
      responseTime: 5000,       // 5 seconds alert threshold
      memoryUsage: 0.9,        // 90% memory alert
      errorRate: 0.1           // 10% error rate alert
    }
  }
};
```

## Performance Monitoring

### Generate Performance Report

```typescript
const report = performanceOptimizer.generatePerformanceReport();

console.log('Performance Report:', {
  averageResponseTime: report.averageResponseTime,
  cacheHitRates: report.cacheHitRates,
  memoryUsage: report.memoryUsage,
  queueStatus: report.queueStatus,
  bottlenecks: report.bottlenecks
});
```

### Cache Statistics

```typescript
const stats = performanceOptimizer.getCacheStatistics();

console.log('Cache Performance:', {
  textExtraction: `${stats.textExtraction.hitRate * 100}% hit rate`,
  aiResults: `${stats.aiResults.hitRate * 100}% hit rate`,
  validation: `${stats.validation.hitRate * 100}% hit rate`,
  queries: `${stats.queries.hitRate * 100}% hit rate`
});
```

### Processing Strategy Optimization

```typescript
// Get optimized processing strategy for a PDF
const strategy = await performanceOptimizer.optimizeProcessingStrategy(
  pdfSize,
  pageCount
);

console.log('Processing Strategy:', {
  chunkSize: strategy.chunkSize,
  concurrent: strategy.concurrent,
  priority: strategy.priority
});
```

## Advanced Usage

### Resource Pooling

```typescript
// Borrow expensive resources from pool
const pdfParser = await performanceOptimizer.borrowResource('pdf-parser');
const aiClient = await performanceOptimizer.borrowResource('ai-client');

try {
  // Use resources
  const result = await processWithResources(pdfParser, aiClient);
} finally {
  // Return resources to pool
  performanceOptimizer.returnResource('pdf-parser', pdfParser);
  performanceOptimizer.returnResource('ai-client', aiClient);
}
```

### Memory Management

```typescript
// Memory optimization is automatic, but you can also trigger manually
performanceOptimizer.triggerMemoryOptimization();

// Monitor memory usage
setInterval(() => {
  const report = performanceOptimizer.generatePerformanceReport();
  if (report.memoryUsage.current > 500) { // 500MB
    console.warn('High memory usage detected:', report.memoryUsage);
  }
}, 30000); // Check every 30 seconds
```

### Custom Cache Keys

```typescript
// The system generates cache keys automatically, but you can understand the pattern
// Cache key generation is based on operation type and relevant data:
// - Text extraction: hash(pdf_url)
// - AI results: hash(text_sample + prompt)
// - Validation: hash(data_to_validate)
// - Queries: hash(query + parameters)
```

## Best Practices

### 1. Cache Warming

```typescript
// Warm cache on application startup
await performanceOptimizer.warmCache();

// Implement custom cache warming for your specific patterns
async function warmCustomCache() {
  const commonMakes = ['volkswagen', 'audi', 'bmw', 'mercedes-benz'];
  
  for (const make of commonMakes) {
    await performanceOptimizer.executeOptimizedQuery(
      'getListingsByMake',
      [make, 20, 0]
    );
  }
}
```

### 2. Error Handling

```typescript
try {
  const result = await performanceOptimizer.executeOptimizedQuery(
    'getListingById',
    [listingId]
  );
} catch (error) {
  console.error('Query failed:', error);
  // Fallback to direct database query if needed
}
```

### 3. Monitoring Integration

```typescript
// Set up periodic performance monitoring
setInterval(() => {
  const report = performanceOptimizer.generatePerformanceReport();
  
  // Log performance metrics
  console.log('Performance Metrics:', {
    avgResponseTime: Object.values(report.averageResponseTime).reduce((a, b) => a + b, 0) / Object.keys(report.averageResponseTime).length,
    overallCacheHitRate: Object.values(report.cacheHitRates).reduce((a, b) => a + b, 0) / Object.keys(report.cacheHitRates).length,
    memoryUsage: report.memoryUsage.current,
    queueSize: report.queueStatus.size
  });
  
  // Alert on bottlenecks
  if (report.bottlenecks.length > 0) {
    console.warn('Performance bottlenecks detected:', report.bottlenecks);
  }
}, 60000); // Every minute
```

### 4. Graceful Shutdown

```typescript
// Clean up resources on application shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down performance optimizer...');
  performanceOptimizer.destroy();
});

process.on('SIGINT', () => {
  console.log('Shutting down performance optimizer...');
  performanceOptimizer.destroy();
});
```

## Performance Targets

With the PerformanceOptimizer implemented, you should expect:

- **Cache Hit Rates**: 70-90% for frequent operations
- **Response Time Reduction**: 50-80% for cached operations
- **Memory Usage**: Optimized with automatic cleanup
- **Database Load**: Reduced by 60-80% through query caching
- **Concurrent Processing**: Improved throughput with queue management

## Troubleshooting

### High Memory Usage
```typescript
// Check memory usage and trigger optimization
const report = performanceOptimizer.generatePerformanceReport();
if (report.memoryUsage.current > 1000) { // 1GB
  performanceOptimizer.triggerMemoryOptimization();
}
```

### Low Cache Hit Rates
```typescript
// Analyze cache statistics
const stats = performanceOptimizer.getCacheStatistics();
console.log('Cache analysis:', stats);

// Consider adjusting TTL or cache sizes
const newConfig = {
  caching: {
    textExtraction: { maxSize: 200, ttl: 7200000 } // Increase size/TTL
  }
};
```

### Performance Bottlenecks
```typescript
// Identify and address bottlenecks
const report = performanceOptimizer.generatePerformanceReport();
report.bottlenecks.forEach(bottleneck => {
  console.log(`Bottleneck identified: ${bottleneck}`);
  // Implement specific optimizations based on bottleneck type
});
```

## Testing

The PerformanceOptimizer includes comprehensive test coverage:

```bash
# Run performance optimizer tests
npm test -- PerformanceOptimizer.test.ts

# Run with coverage
npm run test:coverage -- PerformanceOptimizer.test.ts
```

## Integration with Existing Code

The PerformanceOptimizer is designed to be a drop-in optimization layer that can be gradually integrated:

1. **Start with query optimization**: Replace direct database calls
2. **Add caching layer**: Implement caching for expensive operations
3. **Enable monitoring**: Set up performance monitoring and alerts
4. **Optimize processing**: Use queue management and resource pooling

This approach allows for incremental performance improvements without disrupting existing functionality.