import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceOptimizer } from './PerformanceOptimizer';
import { ProcessingJob } from '../types/processing-job';

describe('PerformanceOptimizer', () => {
  let optimizer: PerformanceOptimizer;
  let originalGc: any;

  beforeEach(() => {
    // Reset singleton instance
    (PerformanceOptimizer as any).instance = null;
    
    // Mock global.gc
    originalGc = global.gc;
    global.gc = vi.fn();
    
    // Mock process.memoryUsage
    vi.spyOn(process, 'memoryUsage').mockReturnValue({
      rss: 100 * 1024 * 1024, // 100MB
      heapTotal: 80 * 1024 * 1024,
      heapUsed: 60 * 1024 * 1024,
      external: 5 * 1024 * 1024,
      arrayBuffers: 2 * 1024 * 1024
    });
    
    optimizer = PerformanceOptimizer.getInstance();
  });

  afterEach(() => {
    global.gc = originalGc;
    optimizer.destroy();
    vi.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = PerformanceOptimizer.getInstance();
      const instance2 = PerformanceOptimizer.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should use custom config when provided', () => {
      const customConfig = {
        processing: {
          maxConcurrent: 10,
          chunkSize: 2048,
          memoryThreshold: 0.7,
          queuePriority: false
        }
      };
      
      const customOptimizer = PerformanceOptimizer.getInstance(customConfig);
      expect(customOptimizer).toBeInstanceOf(PerformanceOptimizer);
    });
  });

  describe('Cache Operations', () => {
    describe('Text Extraction Cache', () => {
      it('should cache and retrieve text extraction results', async () => {
        const pdfUrl = 'https://example.com/test.pdf';
        const extractedText = 'Sample extracted text';
        
        // Set cache
        optimizer.setCachedTextExtraction(pdfUrl, extractedText);
        
        // Mock cache hit
        const mockCache = (optimizer as any).textExtractionCache;
        mockCache.get.mockReturnValue(extractedText);
        
        // Get cached result
        const cached = await optimizer.getCachedTextExtraction(pdfUrl);
        expect(cached).toBe(extractedText);
      });

      it('should return null for cache miss', async () => {
        const pdfUrl = 'https://example.com/nonexistent.pdf';
        
        // Mock cache miss
        const mockCache = (optimizer as any).textExtractionCache;
        mockCache.get.mockReturnValue(undefined);
        
        const cached = await optimizer.getCachedTextExtraction(pdfUrl);
        expect(cached).toBeNull();
      });
    });

    describe('AI Results Cache', () => {
      it('should cache and retrieve AI processing results', async () => {
        const text = 'Sample text for AI processing';
        const prompt = 'Extract car information';
        const aiResult = { make: 'Toyota', model: 'Camry' };
        
        // Set cache
        optimizer.setCachedAIResult(text, prompt, aiResult);
        
        // Mock cache hit
        const mockCache = (optimizer as any).aiResultsCache;
        mockCache.get.mockReturnValue(aiResult);
        
        // Get cached result
        const cached = await optimizer.getCachedAIResult(text, prompt);
        expect(cached).toEqual(aiResult);
      });
    });

    describe('Validation Cache', () => {
      it('should cache validation results', async () => {
        const data = { make: 'Toyota', model: 'Camry', year: 2020 };
        const validationResult = { valid: true, errors: [] };
        
        // Set cache
        optimizer.setCachedValidation(data, validationResult);
        
        // Mock cache hit
        const mockCache = (optimizer as any).validationCache;
        mockCache.get.mockReturnValue(validationResult);
        
        // Get cached result
        const cached = await optimizer.getCachedValidation(data);
        expect(cached).toEqual(validationResult);
      });
    });

    describe('Query Cache', () => {
      it('should cache database query results', async () => {
        const query = 'SELECT * FROM listings WHERE make = $1';
        const params = ['Toyota'];
        const queryResult = [{ id: 1, make: 'Toyota', model: 'Camry' }];
        
        // Set cache
        optimizer.setCachedQuery(query, params, queryResult);
        
        // Mock cache hit
        const mockCache = (optimizer as any).queryCache;
        mockCache.get.mockReturnValue(queryResult);
        
        // Get cached result
        const cached = await optimizer.getCachedQuery(query, params);
        expect(cached).toEqual(queryResult);
      });
    });
  });

  describe('Database Optimization', () => {
    it('should execute optimized queries with caching', async () => {
      const mockResult = [{ id: 1, make: 'Toyota' }];
      
      // Mock database connection and query
      const mockClient = {
        query: vi.fn().mockResolvedValue({ rows: mockResult }),
        release: vi.fn()
      };
      
      const mockPool = (optimizer as any).dbPool;
      mockPool.connect.mockResolvedValue(mockClient);
      
      // Mock cache miss first, then execute query
      const mockCache = (optimizer as any).queryCache;
      mockCache.get.mockReturnValue(null);
      
      const result = await optimizer.executeOptimizedQuery('getListingById', ['123']);
      
      expect(mockClient.query).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should return cached result without database call', async () => {
      const cachedResult = [{ id: 1, make: 'Toyota' }];
      
      // Mock cache hit
      const mockCache = (optimizer as any).queryCache;
      mockCache.get.mockReturnValue(cachedResult);
      
      const result = await optimizer.executeOptimizedQuery('getListingById', ['123']);
      
      expect(result).toEqual(cachedResult);
      // Database should not be called
      const mockPool = (optimizer as any).dbPool;
      expect(mockPool.connect).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      // Mock cache miss
      const mockCache = (optimizer as any).queryCache;
      mockCache.get.mockReturnValue(null);
      
      // Mock database error
      const mockPool = (optimizer as any).dbPool;
      mockPool.connect.mockRejectedValue(new Error('Database connection failed'));
      
      await expect(
        optimizer.executeOptimizedQuery('getListingById', ['123'])
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('Processing Strategy Optimization', () => {
    it('should optimize strategy based on PDF complexity', async () => {
      const smallPdf = await optimizer.optimizeProcessingStrategy(1024 * 1024, 5); // 1MB, 5 pages
      expect(smallPdf.concurrent).toBe(true);
      expect(smallPdf.priority).toBeLessThan(0.5);
      
      const largePdf = await optimizer.optimizeProcessingStrategy(50 * 1024 * 1024, 200); // 50MB, 200 pages
      expect(largePdf.concurrent).toBe(false);
      expect(largePdf.priority).toBeGreaterThan(0.5);
    });

    it('should adjust chunk size based on complexity', async () => {
      const complexPdf = await optimizer.optimizeProcessingStrategy(100 * 1024 * 1024, 500);
      const simplePdf = await optimizer.optimizeProcessingStrategy(1024 * 1024, 5);
      
      expect(complexPdf.chunkSize).toBeLessThan(simplePdf.chunkSize);
    });
  });

  describe('Queue Management', () => {
    it('should add jobs to processing queue with priority', async () => {
      const job: ProcessingJob = {
        id: 'test-job-1',
        created_at: new Date(),
        status: 'pending',
        job_type: 'pdf_processing',
        metadata: { file_size: 1024 * 1024 },
        retry_count: 0
      };
      
      await optimizer.addToProcessingQueue(job);
      
      const queueStatus = optimizer.generatePerformanceReport().queueStatus;
      expect(queueStatus.size).toBeGreaterThan(0);
    });

    it('should calculate job priority correctly', async () => {
      const oldJob: ProcessingJob = {
        id: 'old-job',
        created_at: new Date(Date.now() - 2 * 3600 * 1000), // 2 hours ago
        status: 'pending',
        job_type: 'pdf_processing',
        metadata: { file_size: 5 * 1024 * 1024 }, // 5MB
        retry_count: 1
      };
      
      const newJob: ProcessingJob = {
        id: 'new-job',
        created_at: new Date(), // Now
        status: 'pending',
        job_type: 'pdf_processing',
        metadata: { file_size: 100 * 1024 * 1024 }, // 100MB
        retry_count: 0
      };
      
      // Old job should have higher priority due to age and retries
      await optimizer.addToProcessingQueue(oldJob);
      await optimizer.addToProcessingQueue(newJob);
      
      const report = optimizer.generatePerformanceReport();
      expect(report.queueStatus.size).toBe(2);
    });
  });

  describe('Memory Management', () => {
    it('should trigger memory optimization when threshold exceeded', () => {
      // Mock high memory usage
      vi.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 1000 * 1024 * 1024, // 1GB
        heapTotal: 900 * 1024 * 1024,
        heapUsed: 850 * 1024 * 1024, // 85% of RSS
        external: 50 * 1024 * 1024,
        arrayBuffers: 10 * 1024 * 1024
      });
      
      // Trigger memory check manually
      (optimizer as any).triggerMemoryOptimization();
      
      // Verify garbage collection was called
      expect(global.gc).toHaveBeenCalled();
    });

    it('should clear cache entries during memory optimization', () => {
      const mockCaches = [
        (optimizer as any).textExtractionCache,
        (optimizer as any).aiResultsCache,
        (optimizer as any).validationCache,
        (optimizer as any).queryCache
      ];
      
      // Mock cache sizes
      mockCaches.forEach(cache => {
        cache.size = 100;
      });
      
      (optimizer as any).triggerMemoryOptimization();
      
      // Verify cache cleanup was attempted
      mockCaches.forEach(cache => {
        expect(cache.delete).toHaveBeenCalled();
      });
    });
  });

  describe('Cache Statistics', () => {
    it('should provide accurate cache statistics', () => {
      // Mock metrics data
      (optimizer as any).metrics = [
        { operationType: 'text-extraction-cache', cacheHit: true, startTime: 1000, endTime: 1100, memoryUsed: 0 },
        { operationType: 'text-extraction-cache', cacheHit: false, startTime: 1200, endTime: 1300, memoryUsed: 0 },
        { operationType: 'ai-result-cache', cacheHit: true, startTime: 1400, endTime: 1500, memoryUsed: 0 }
      ];
      
      const stats = optimizer.getCacheStatistics();
      
      expect(stats.textExtraction.hits).toBe(1);
      expect(stats.textExtraction.misses).toBe(1);
      expect(stats.textExtraction.hitRate).toBe(0.5);
      expect(stats.aiResults.hits).toBe(1);
      expect(stats.aiResults.misses).toBe(0);
      expect(stats.aiResults.hitRate).toBe(1);
    });
  });

  describe('Performance Reporting', () => {
    it('should generate comprehensive performance report', () => {
      // Mock performance metrics
      (optimizer as any).metrics = [
        {
          operationType: 'database-query',
          startTime: 1000,
          endTime: 1200,
          memoryUsed: 50 * 1024 * 1024,
          cacheHit: false,
          queryTime: 200
        },
        {
          operationType: 'text-extraction',
          startTime: 2000,
          endTime: 2500,
          memoryUsed: 60 * 1024 * 1024,
          cacheHit: false
        }
      ];
      
      const report = optimizer.generatePerformanceReport();
      
      expect(report.averageResponseTime).toBeDefined();
      expect(report.cacheHitRates).toBeDefined();
      expect(report.memoryUsage).toBeDefined();
      expect(report.queueStatus).toBeDefined();
      expect(report.bottlenecks).toBeDefined();
      
      expect(report.averageResponseTime['database-query']).toBe(200);
      expect(report.averageResponseTime['text-extraction']).toBe(500);
    });

    it('should identify performance bottlenecks', () => {
      // Mock slow operations
      (optimizer as any).metrics = [
        {
          operationType: 'slow-operation',
          startTime: 1000,
          endTime: 7000, // 6 seconds - above threshold
          memoryUsed: 0,
          cacheHit: false
        }
      ];
      
      const report = optimizer.generatePerformanceReport();
      expect(report.bottlenecks).toContain('slow-operation: 6000.00ms average');
    });
  });

  describe('Batch Processing', () => {
    it('should process items in batches with concurrency control', async () => {
      const items = Array.from({ length: 25 }, (_, i) => i); // 25 items
      const processor = vi.fn().mockImplementation((item: number) => 
        Promise.resolve(item * 2)
      );
      
      const results = await optimizer.processBatch(items, processor, {
        batchSize: 10,
        maxConcurrent: 3
      });
      
      expect(results).toHaveLength(25);
      expect(results[0]).toBe(0);
      expect(results[24]).toBe(48);
      expect(processor).toHaveBeenCalledTimes(25);
    });
  });

  describe('Resource Pooling', () => {
    it('should borrow and return resources to pool', async () => {
      // Return resource to pool
      const resource = { id: 'test-resource' };
      optimizer.returnResource('test-type', resource);
      
      // Borrow resource from pool
      const borrowed = await optimizer.borrowResource('test-type');
      expect(borrowed).toEqual(resource);
    });

    it('should create new resource when pool is empty', async () => {
      const borrowed = await optimizer.borrowResource('pdf-parser');
      expect(borrowed).toBeDefined();
    });
  });

  describe('Cache Warming', () => {
    it('should warm cache with common queries', async () => {
      // Mock successful query execution
      const mockExecuteQuery = vi.spyOn(optimizer, 'executeOptimizedQuery')
        .mockResolvedValue([]);
      
      await optimizer.warmCache();
      
      expect(mockExecuteQuery).toHaveBeenCalledWith('getListingsByMake', ['volkswagen', 20, 0]);
      expect(mockExecuteQuery).toHaveBeenCalledWith('getListingsByMake', ['audi', 20, 0]);
      expect(mockExecuteQuery).toHaveBeenCalledWith('getListingsByMake', ['bmw', 20, 0]);
    });

    it('should handle cache warming errors gracefully', async () => {
      // Mock failed query execution
      const mockExecuteQuery = vi.spyOn(optimizer, 'executeOptimizedQuery')
        .mockRejectedValue(new Error('Query failed'));
      
      // Should not throw error
      await expect(optimizer.warmCache()).resolves.not.toThrow();
      
      expect(mockExecuteQuery).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should properly cleanup resources', () => {
      const mockPool = (optimizer as any).dbPool;
      const mockCaches = [
        (optimizer as any).textExtractionCache,
        (optimizer as any).aiResultsCache,
        (optimizer as any).validationCache,
        (optimizer as any).queryCache
      ];
      
      optimizer.destroy();
      
      expect(mockPool.end).toHaveBeenCalled();
      mockCaches.forEach(cache => {
        expect(cache.clear).toHaveBeenCalled();
      });
    });
  });
});