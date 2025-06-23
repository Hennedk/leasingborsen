// Type-only imports to avoid dependency issues
import type { ProcessingJob } from '../types/processing-job';
import type { CarListing } from '../types/car-listing';

// Simple LRU Cache implementation to avoid external dependency
class SimpleLRUCache<K, V> {
  private cache = new Map<K, { value: V; timestamp: number }>();
  private maxSize: number;
  private ttl: number;

  constructor(options: { max: number; ttl: number }) {
    this.maxSize = options.max;
    this.ttl = options.ttl;
  }

  get(key: K): V | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }
    
    return item.value;
  }

  set(key: K, value: V): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  keys(): IterableIterator<K> {
    return this.cache.keys();
  }
}

// Simple hash function to replace crypto
function simpleHash(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

// Mock database pool interface
interface MockPool {
  connect(): Promise<{ query: (sql: string, params: any[]) => Promise<{ rows: any[] }>; release: () => void }>;
  end(): void;
}

interface CacheOptions {
  maxSize: number;
  ttl: number;
  updateAgeOnGet?: boolean;
}

interface PerformanceMetrics {
  operationType: string;
  startTime: number;
  endTime: number;
  memoryUsed: number;
  cacheHit: boolean;
  queryTime?: number;
  resultSize?: number;
}

interface OptimizationConfig {
  caching: {
    textExtraction: CacheOptions;
    aiResults: CacheOptions;
    validation: CacheOptions;
    queryResults: CacheOptions;
  };
  processing: {
    maxConcurrent: number;
    chunkSize: number;
    memoryThreshold: number;
    queuePriority: boolean;
  };
  monitoring: {
    metricsRetention: number;
    alertThresholds: {
      responseTime: number;
      memoryUsage: number;
      errorRate: number;
    };
  };
}

export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  
  // Multi-level caching
  private textExtractionCache: SimpleLRUCache<string, string>;
  private aiResultsCache: SimpleLRUCache<string, any>;
  private validationCache: SimpleLRUCache<string, any>;
  private queryCache: SimpleLRUCache<string, any>;
  
  // Performance monitoring
  private metrics: PerformanceMetrics[] = [];
  private metricsBuffer: Map<string, PerformanceMetrics> = new Map();
  
  // Resource management
  private processingQueue: Map<string, ProcessingJob> = new Map();
  private activeProcessing: number = 0;
  private memoryMonitor: NodeJS.Timer;
  
  // Database optimization
  private dbPool: MockPool;
  private preparedStatements: Map<string, string> = new Map();
  
  private config: OptimizationConfig;

  private constructor(config?: Partial<OptimizationConfig>) {
    this.config = this.mergeConfig(config);
    this.initializeCaches();
    this.initializeMonitoring();
    this.initializeDatabase();
  }

  static getInstance(config?: Partial<OptimizationConfig>): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer(config);
    }
    return PerformanceOptimizer.instance;
  }

  private mergeConfig(config?: Partial<OptimizationConfig>): OptimizationConfig {
    const defaults: OptimizationConfig = {
      caching: {
        textExtraction: { maxSize: 100, ttl: 3600000, updateAgeOnGet: true }, // 1 hour
        aiResults: { maxSize: 500, ttl: 1800000, updateAgeOnGet: true }, // 30 minutes
        validation: { maxSize: 1000, ttl: 600000 }, // 10 minutes
        queryResults: { maxSize: 200, ttl: 300000 } // 5 minutes
      },
      processing: {
        maxConcurrent: 5,
        chunkSize: 1024 * 1024, // 1MB chunks
        memoryThreshold: 0.8, // 80% memory usage
        queuePriority: true
      },
      monitoring: {
        metricsRetention: 86400000, // 24 hours
        alertThresholds: {
          responseTime: 5000, // 5 seconds
          memoryUsage: 0.9, // 90%
          errorRate: 0.1 // 10%
        }
      }
    };
    
    return config ? { ...defaults, ...config } : defaults;
  }

  private initializeCaches(): void {
    this.textExtractionCache = new SimpleLRUCache<string, string>({
      max: this.config.caching.textExtraction.maxSize,
      ttl: this.config.caching.textExtraction.ttl
    });

    this.aiResultsCache = new SimpleLRUCache<string, any>({
      max: this.config.caching.aiResults.maxSize,
      ttl: this.config.caching.aiResults.ttl
    });

    this.validationCache = new SimpleLRUCache<string, any>({
      max: this.config.caching.validation.maxSize,
      ttl: this.config.caching.validation.ttl
    });

    this.queryCache = new SimpleLRUCache<string, any>({
      max: this.config.caching.queryResults.maxSize,
      ttl: this.config.caching.queryResults.ttl
    });
  }

  private initializeMonitoring(): void {
    // Monitor memory usage every 10 seconds
    this.memoryMonitor = setInterval(() => {
      const usage = process.memoryUsage();
      const totalMemory = process.memoryUsage.rss ? usage.rss : 0;
      const heapUsed = usage.heapUsed;
      
      if (heapUsed / totalMemory > this.config.processing.memoryThreshold) {
        this.triggerMemoryOptimization();
      }
    }, 10000);

    // Clean up old metrics periodically
    setInterval(() => {
      const cutoff = Date.now() - this.config.monitoring.metricsRetention;
      this.metrics = this.metrics.filter(m => m.endTime > cutoff);
    }, 3600000); // Every hour
  }

  private initializeDatabase(): void {
    // Mock database pool for testing
    this.dbPool = {
      connect: async () => ({
        query: async (sql: string, params: any[]) => ({ rows: [] }),
        release: () => {}
      }),
      end: () => {}
    };

    // Prepare common statements
    this.preparedStatements.set('getListingById', `
      SELECT * FROM full_listing_view WHERE listing_id = $1
    `);
    
    this.preparedStatements.set('getListingsByMake', `
      SELECT * FROM full_listing_view 
      WHERE make = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `);
    
    this.preparedStatements.set('searchListings', `
      SELECT * FROM full_listing_view 
      WHERE to_tsvector('danish', make || ' ' || model || ' ' || variant) @@ plainto_tsquery('danish', $1)
      ORDER BY ts_rank(to_tsvector('danish', make || ' ' || model || ' ' || variant), plainto_tsquery('danish', $1)) DESC
      LIMIT $2 OFFSET $3
    `);
  }

  // Cache key generation
  private generateCacheKey(type: string, data: any): string {
    const content = type + JSON.stringify(data);
    return simpleHash(content);
  }

  // Text extraction caching
  async getCachedTextExtraction(pdfUrl: string): Promise<string | null> {
    const key = this.generateCacheKey('text-extraction', { pdfUrl });
    const cached = this.textExtractionCache.get(key);
    
    if (cached) {
      this.recordMetric('text-extraction-cache', Date.now(), Date.now(), 0, true);
    }
    
    return cached || null;
  }

  setCachedTextExtraction(pdfUrl: string, text: string): void {
    const key = this.generateCacheKey('text-extraction', { pdfUrl });
    this.textExtractionCache.set(key, text);
  }

  // AI results caching
  async getCachedAIResult(text: string, prompt: string): Promise<any | null> {
    const key = this.generateCacheKey('ai-result', { text: text.substring(0, 100), prompt });
    const cached = this.aiResultsCache.get(key);
    
    if (cached) {
      this.recordMetric('ai-result-cache', Date.now(), Date.now(), 0, true);
    }
    
    return cached || null;
  }

  setCachedAIResult(text: string, prompt: string, result: any): void {
    const key = this.generateCacheKey('ai-result', { text: text.substring(0, 100), prompt });
    this.aiResultsCache.set(key, result);
  }

  // Validation caching
  async getCachedValidation(data: any): Promise<any | null> {
    const key = this.generateCacheKey('validation', data);
    const cached = this.validationCache.get(key);
    
    if (cached) {
      this.recordMetric('validation-cache', Date.now(), Date.now(), 0, true);
    }
    
    return cached || null;
  }

  setCachedValidation(data: any, result: any): void {
    const key = this.generateCacheKey('validation', data);
    this.validationCache.set(key, result);
  }

  // Query result caching
  async getCachedQuery(query: string, params: any[]): Promise<any | null> {
    const key = this.generateCacheKey('query', { query, params });
    const cached = this.queryCache.get(key);
    
    if (cached) {
      this.recordMetric('query-cache', Date.now(), Date.now(), 0, true);
    }
    
    return cached || null;
  }

  setCachedQuery(query: string, params: any[], result: any): void {
    const key = this.generateCacheKey('query', { query, params });
    this.queryCache.set(key, result);
  }

  // Optimized database query execution
  async executeOptimizedQuery(queryName: string, params: any[]): Promise<any> {
    const startTime = Date.now();
    
    // Check cache first
    const query = this.preparedStatements.get(queryName);
    if (!query) {
      throw new Error(`Unknown prepared statement: ${queryName}`);
    }
    
    const cached = await this.getCachedQuery(query, params);
    if (cached) {
      return cached;
    }
    
    try {
      const client = await this.dbPool.connect();
      const result = await client.query(query, params);
      client.release();
      
      // Cache the result
      this.setCachedQuery(query, params, result.rows);
      
      const endTime = Date.now();
      this.recordMetric('database-query', startTime, endTime, 0, false, endTime - startTime, result.rows.length);
      
      return result.rows;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  // Adaptive processing based on PDF complexity
  async optimizeProcessingStrategy(pdfSize: number, pageCount: number): Promise<{
    chunkSize: number;
    concurrent: boolean;
    priority: number;
  }> {
    const complexity = this.calculateComplexity(pdfSize, pageCount);
    
    return {
      chunkSize: complexity > 0.7 ? this.config.processing.chunkSize / 2 : this.config.processing.chunkSize,
      concurrent: this.activeProcessing < this.config.processing.maxConcurrent && complexity < 0.5,
      priority: complexity
    };
  }

  private calculateComplexity(size: number, pages: number): number {
    const sizeScore = Math.min(size / (10 * 1024 * 1024), 1); // 10MB as max
    const pageScore = Math.min(pages / 100, 1); // 100 pages as max
    return (sizeScore + pageScore) / 2;
  }

  // Queue management with priority
  async addToProcessingQueue(job: ProcessingJob): Promise<void> {
    const priority = await this.calculateJobPriority(job);
    
    // Add to queue with priority
    this.processingQueue.set(job.id, { ...job, priority });
    
    // Note: Actual processing would be triggered separately in production
    // For testing, we just queue the job
  }

  private async calculateJobPriority(job: ProcessingJob): Promise<number> {
    // Priority based on: age, size, user tier, retry count
    const agePriority = Math.min((Date.now() - job.created_at.getTime()) / 3600000, 1); // Age in hours
    const sizePriority = 1 - Math.min(job.metadata?.file_size / (50 * 1024 * 1024) || 0, 1); // Smaller files higher priority
    const retryPriority = Math.min((job.retry_count || 0) * 0.2, 0.8); // Higher priority for retries
    
    return (agePriority + sizePriority + retryPriority) / 3;
  }

  private async processNextInQueue(): Promise<void> {
    if (this.processingQueue.size === 0) return;
    
    // Get highest priority job
    let highestPriority = -1;
    let selectedJob: ProcessingJob | null = null;
    
    for (const [id, job] of this.processingQueue) {
      if (job.priority! > highestPriority) {
        highestPriority = job.priority!;
        selectedJob = job;
      }
    }
    
    if (selectedJob) {
      this.processingQueue.delete(selectedJob.id);
      this.activeProcessing++;
      
      // Process job (implementation would go here)
      // After processing:
      this.activeProcessing--;
      
      // Process next if available
      if (this.processingQueue.size > 0) {
        this.processNextInQueue();
      }
    }
  }

  // Memory optimization
  private triggerMemoryOptimization(): void {
    console.log('Triggering memory optimization...');
    
    // Clear least recently used cache entries
    const caches = [
      this.textExtractionCache,
      this.aiResultsCache,
      this.validationCache,
      this.queryCache
    ];
    
    for (const cache of caches) {
      const currentSize = cache.size;
      const targetSize = Math.floor(currentSize * 0.7); // Reduce to 70%
      
      while (cache.size > targetSize) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey) {
          cache.delete(oldestKey);
        } else {
          break;
        }
      }
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }

  // Performance metrics recording
  private recordMetric(
    operationType: string,
    startTime: number,
    endTime: number,
    memoryUsed: number,
    cacheHit: boolean,
    queryTime?: number,
    resultSize?: number
  ): void {
    const metric: PerformanceMetrics = {
      operationType,
      startTime,
      endTime,
      memoryUsed,
      cacheHit,
      queryTime,
      resultSize
    };
    
    this.metrics.push(metric);
    
    // Check for performance alerts
    const responseTime = endTime - startTime;
    if (responseTime > this.config.monitoring.alertThresholds.responseTime) {
      console.warn(`Performance alert: ${operationType} took ${responseTime}ms`);
    }
  }

  // Cache warming for predictable patterns
  async warmCache(): Promise<void> {
    console.log('Warming cache...');
    
    // Warm up common queries
    const commonQueries = [
      { name: 'getListingsByMake', params: ['volkswagen', 20, 0] },
      { name: 'getListingsByMake', params: ['audi', 20, 0] },
      { name: 'getListingsByMake', params: ['bmw', 20, 0] }
    ];
    
    for (const query of commonQueries) {
      try {
        await this.executeOptimizedQuery(query.name, query.params);
      } catch (error) {
        console.error(`Failed to warm cache for ${query.name}:`, error);
      }
    }
  }

  // Cache statistics
  getCacheStatistics(): {
    textExtraction: { size: number; hits: number; misses: number; hitRate: number };
    aiResults: { size: number; hits: number; misses: number; hitRate: number };
    validation: { size: number; hits: number; misses: number; hitRate: number };
    queries: { size: number; hits: number; misses: number; hitRate: number };
  } {
    const calculateStats = (cacheName: string) => {
      const hits = this.metrics.filter(m => 
        m.operationType === `${cacheName}-cache` && m.cacheHit
      ).length;
      const total = this.metrics.filter(m => 
        m.operationType === `${cacheName}-cache`
      ).length;
      const misses = total - hits;
      
      return {
        hits,
        misses,
        hitRate: total > 0 ? hits / total : 0
      };
    };
    
    return {
      textExtraction: {
        size: this.textExtractionCache.size,
        ...calculateStats('text-extraction')
      },
      aiResults: {
        size: this.aiResultsCache.size,
        ...calculateStats('ai-result')
      },
      validation: {
        size: this.validationCache.size,
        ...calculateStats('validation')
      },
      queries: {
        size: this.queryCache.size,
        ...calculateStats('query')
      }
    };
  }

  // Performance report generation
  generatePerformanceReport(): {
    averageResponseTime: { [key: string]: number };
    cacheHitRates: { [key: string]: number };
    memoryUsage: { current: number; peak: number };
    queueStatus: { size: number; processing: number };
    bottlenecks: string[];
  } {
    // Calculate average response times by operation
    const responseTimesByOp: { [key: string]: number[] } = {};
    
    for (const metric of this.metrics) {
      const responseTime = metric.endTime - metric.startTime;
      if (!responseTimesByOp[metric.operationType]) {
        responseTimesByOp[metric.operationType] = [];
      }
      responseTimesByOp[metric.operationType].push(responseTime);
    }
    
    const averageResponseTime: { [key: string]: number } = {};
    for (const [op, times] of Object.entries(responseTimesByOp)) {
      averageResponseTime[op] = times.reduce((a, b) => a + b, 0) / times.length;
    }
    
    // Get cache statistics
    const cacheStats = this.getCacheStatistics();
    const cacheHitRates = {
      textExtraction: cacheStats.textExtraction.hitRate,
      aiResults: cacheStats.aiResults.hitRate,
      validation: cacheStats.validation.hitRate,
      queries: cacheStats.queries.hitRate
    };
    
    // Memory usage
    const usage = process.memoryUsage();
    const currentMemory = usage.heapUsed / (1024 * 1024); // MB
    const peakMemory = Math.max(...this.metrics.map(m => m.memoryUsed)) / (1024 * 1024);
    
    // Identify bottlenecks
    const bottlenecks: string[] = [];
    for (const [op, avgTime] of Object.entries(averageResponseTime)) {
      if (avgTime > this.config.monitoring.alertThresholds.responseTime) {
        bottlenecks.push(`${op}: ${avgTime.toFixed(2)}ms average`);
      }
    }
    
    return {
      averageResponseTime,
      cacheHitRates,
      memoryUsage: {
        current: currentMemory,
        peak: peakMemory
      },
      queueStatus: {
        size: this.processingQueue.size,
        processing: this.activeProcessing
      },
      bottlenecks
    };
  }

  // Batch operation optimization
  async processBatch<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    options?: { batchSize?: number; maxConcurrent?: number }
  ): Promise<R[]> {
    const batchSize = options?.batchSize || 10;
    const maxConcurrent = options?.maxConcurrent || this.config.processing.maxConcurrent;
    const results: R[] = [];
    
    // Process items in batches
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      // Process current batch with concurrency control
      const processWithConcurrency = async (items: T[], concurrency: number): Promise<R[]> => {
        const results: R[] = [];
        
        for (let j = 0; j < items.length; j += concurrency) {
          const concurrentItems = items.slice(j, j + concurrency);
          const promises = concurrentItems.map(item => processor(item));
          const batchResults = await Promise.all(promises);
          results.push(...batchResults);
        }
        
        return results;
      };
      
      const batchResults = await processWithConcurrency(batch, Math.min(maxConcurrent, batch.length));
      results.push(...batchResults);
    }
    
    return results;
  }

  // Resource pooling for expensive operations
  private resourcePool: Map<string, any[]> = new Map();
  
  async borrowResource(type: string): Promise<any> {
    const pool = this.resourcePool.get(type) || [];
    
    if (pool.length > 0) {
      return pool.pop();
    }
    
    // Create new resource if none available
    switch (type) {
      case 'pdf-parser':
        // Return PDF parser instance
        return {}; // Placeholder
      case 'ai-client':
        // Return AI client instance
        return {}; // Placeholder
      default:
        throw new Error(`Unknown resource type: ${type}`);
    }
  }
  
  returnResource(type: string, resource: any): void {
    const pool = this.resourcePool.get(type) || [];
    pool.push(resource);
    this.resourcePool.set(type, pool);
  }

  // Cleanup
  destroy(): void {
    clearInterval(this.memoryMonitor);
    this.dbPool.end();
    this.textExtractionCache.clear();
    this.aiResultsCache.clear();
    this.validationCache.clear();
    this.queryCache.clear();
  }
}

// Export singleton instance
export const performanceOptimizer = PerformanceOptimizer.getInstance();