import { performanceOptimizer } from './PerformanceOptimizer';
import { ProcessingJob } from '../types/processing-job';
import { CarListing } from '../types/car-listing';

/**
 * Integration example showing how to use PerformanceOptimizer 
 * with the existing PDF processing pipeline
 */

// Mock imports - replace with actual implementations
interface PDFProcessor {
  extractText(url: string): Promise<string>;
}

interface AIProcessor {
  extractCarInfo(text: string, prompt: string): Promise<any>;
}

interface Validator {
  validateCarData(data: any): Promise<{ valid: boolean; data: CarListing; errors: string[] }>;
}

/**
 * Optimized PDF Processing Service
 * Demonstrates integration of PerformanceOptimizer with existing pipeline
 */
export class OptimizedPDFProcessingService {
  private pdfProcessor: PDFProcessor;
  private aiProcessor: AIProcessor;
  private validator: Validator;

  constructor(
    pdfProcessor: PDFProcessor,
    aiProcessor: AIProcessor,
    validator: Validator
  ) {
    this.pdfProcessor = pdfProcessor;
    this.aiProcessor = aiProcessor;
    this.validator = validator;
    
    // Initialize performance monitoring
    this.setupPerformanceMonitoring();
  }

  /**
   * Main processing method with full optimization
   */
  async processPDFWithOptimization(
    pdfUrl: string,
    jobId: string,
    options?: {
      priority?: number;
      skipCache?: boolean;
      metadata?: any;
    }
  ): Promise<CarListing> {
    const startTime = Date.now();
    
    try {
      // 1. Add job to processing queue
      await this.addToProcessingQueue(jobId, pdfUrl, options?.metadata);
      
      // 2. Get processing strategy based on PDF characteristics
      const pdfStats = await this.analyzePDF(pdfUrl);
      const strategy = await performanceOptimizer.optimizeProcessingStrategy(
        pdfStats.size,
        pdfStats.pageCount
      );
      
      console.log(`Processing ${jobId} with strategy:`, strategy);
      
      // 3. Extract text with caching
      const extractedText = await this.extractTextWithCaching(pdfUrl, options?.skipCache);
      
      // 4. Process with AI and caching
      const aiResult = await this.processWithAIAndCaching(extractedText, options?.skipCache);
      
      // 5. Validate with caching
      const validationResult = await this.validateWithCaching(aiResult, options?.skipCache);
      
      // 6. Store result in database with optimized queries
      await this.storeListingOptimized(validationResult.data);
      
      // 7. Record performance metrics
      const endTime = Date.now();
      this.recordProcessingMetrics(jobId, startTime, endTime, strategy);
      
      return validationResult.data;
      
    } catch (error) {
      console.error(`Processing failed for job ${jobId}:`, error);
      await this.handleProcessingError(jobId, error);
      throw error;
    }
  }

  /**
   * Batch processing with optimization
   */
  async processBatchPDFs(
    pdfUrls: string[],
    options?: {
      batchSize?: number;
      maxConcurrent?: number;
      priority?: number;
    }
  ): Promise<CarListing[]> {
    console.log(`Starting batch processing of ${pdfUrls.length} PDFs`);
    
    // Create processing jobs
    const jobs = pdfUrls.map((url, index) => ({
      id: `batch-${Date.now()}-${index}`,
      url,
      priority: options?.priority || 0.5
    }));
    
    // Process in optimized batches
    const results = await performanceOptimizer.processBatch(
      jobs,
      async (job) => {
        return await this.processPDFWithOptimization(job.url, job.id, {
          priority: job.priority
        });
      },
      {
        batchSize: options?.batchSize || 5,
        maxConcurrent: options?.maxConcurrent || 3
      }
    );
    
    console.log(`Batch processing completed: ${results.length} listings processed`);
    return results;
  }

  /**
   * Text extraction with intelligent caching
   */
  private async extractTextWithCaching(pdfUrl: string, skipCache = false): Promise<string> {
    if (!skipCache) {
      const cached = await performanceOptimizer.getCachedTextExtraction(pdfUrl);
      if (cached) {
        console.log(`Cache hit for text extraction: ${pdfUrl}`);
        return cached;
      }
    }
    
    console.log(`Extracting text from PDF: ${pdfUrl}`);
    const extractedText = await this.pdfProcessor.extractText(pdfUrl);
    
    // Cache the result
    performanceOptimizer.setCachedTextExtraction(pdfUrl, extractedText);
    
    return extractedText;
  }

  /**
   * AI processing with result caching
   */
  private async processWithAIAndCaching(text: string, skipCache = false): Promise<any> {
    const prompt = `Extract car information from this text including:
    - Make and model
    - Year and mileage
    - Price information
    - Technical specifications
    - Contact details`;
    
    if (!skipCache) {
      const cached = await performanceOptimizer.getCachedAIResult(text, prompt);
      if (cached) {
        console.log('Cache hit for AI processing');
        return cached;
      }
    }
    
    console.log('Processing text with AI...');
    const aiResult = await this.aiProcessor.extractCarInfo(text, prompt);
    
    // Cache the result
    performanceOptimizer.setCachedAIResult(text, prompt, aiResult);
    
    return aiResult;
  }

  /**
   * Validation with result caching
   */
  private async validateWithCaching(data: any, skipCache = false): Promise<{ valid: boolean; data: CarListing; errors: string[] }> {
    if (!skipCache) {
      const cached = await performanceOptimizer.getCachedValidation(data);
      if (cached) {
        console.log('Cache hit for validation');
        return cached;
      }
    }
    
    console.log('Validating car data...');
    const validationResult = await this.validator.validateCarData(data);
    
    // Cache the result
    performanceOptimizer.setCachedValidation(data, validationResult);
    
    return validationResult;
  }

  /**
   * Optimized database operations
   */
  private async storeListingOptimized(listing: CarListing): Promise<void> {
    // Check if listing already exists
    const existing = await performanceOptimizer.executeOptimizedQuery(
      'getListingById',
      [listing.listing_id]
    );
    
    if (existing.length > 0) {
      console.log(`Listing ${listing.listing_id} already exists, updating...`);
      // Update existing listing
      await this.updateListingOptimized(listing);
    } else {
      console.log(`Creating new listing ${listing.listing_id}...`);
      // Create new listing
      await this.createListingOptimized(listing);
    }
  }

  private async createListingOptimized(listing: CarListing): Promise<void> {
    // Use batch operations for related data
    const operations = [
      { table: 'listings', data: listing },
      { table: 'lease_pricing', data: listing.lease_pricing },
      { table: 'car_specifications', data: listing.specifications }
    ];
    
    // Execute batch operations
    for (const op of operations) {
      await performanceOptimizer.executeOptimizedQuery(
        'insertRecord',
        [op.table, op.data]
      );
    }
  }

  private async updateListingOptimized(listing: CarListing): Promise<void> {
    await performanceOptimizer.executeOptimizedQuery(
      'updateListing',
      [listing.listing_id, listing]
    );
  }

  /**
   * Queue management
   */
  private async addToProcessingQueue(
    jobId: string,
    pdfUrl: string,
    metadata?: any
  ): Promise<void> {
    const job: ProcessingJob = {
      id: jobId,
      created_at: new Date(),
      status: 'pending',
      job_type: 'pdf_processing',
      metadata: {
        pdf_url: pdfUrl,
        ...metadata
      },
      retry_count: 0
    };
    
    await performanceOptimizer.addToProcessingQueue(job);
  }

  /**
   * PDF analysis for processing strategy
   */
  private async analyzePDF(pdfUrl: string): Promise<{ size: number; pageCount: number }> {
    // This would typically involve fetching PDF metadata
    // For now, we'll return mock values
    return {
      size: Math.random() * 50 * 1024 * 1024, // 0-50MB
      pageCount: Math.floor(Math.random() * 100) + 1 // 1-100 pages
    };
  }

  /**
   * Error handling with retry logic
   */
  private async handleProcessingError(jobId: string, error: any): Promise<void> {
    console.error(`Processing error for job ${jobId}:`, error);
    
    // Could implement retry logic here
    // For now, just log the error
  }

  /**
   * Performance metrics recording
   */
  private recordProcessingMetrics(
    jobId: string,
    startTime: number,
    endTime: number,
    strategy: any
  ): void {
    const duration = endTime - startTime;
    console.log(`Job ${jobId} completed in ${duration}ms with strategy:`, strategy);
  }

  /**
   * Performance monitoring setup
   */
  private setupPerformanceMonitoring(): void {
    // Generate performance report every 5 minutes
    setInterval(() => {
      const report = performanceOptimizer.generatePerformanceReport();
      
      console.log('Performance Report:', {
        avgResponseTime: this.calculateAverageResponseTime(report.averageResponseTime),
        cacheHitRates: report.cacheHitRates,
        memoryUsage: `${report.memoryUsage.current.toFixed(2)}MB`,
        queueSize: report.queueStatus.size,
        activeJobs: report.queueStatus.processing
      });
      
      // Alert on performance issues
      if (report.bottlenecks.length > 0) {
        console.warn('Performance bottlenecks detected:', report.bottlenecks);
      }
      
      // Alert on low cache hit rates
      Object.entries(report.cacheHitRates).forEach(([cache, hitRate]) => {
        if (hitRate < 0.5) { // Less than 50% hit rate
          console.warn(`Low cache hit rate for ${cache}: ${(hitRate * 100).toFixed(1)}%`);
        }
      });
      
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  private calculateAverageResponseTime(times: { [key: string]: number }): number {
    const values = Object.values(times);
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  }

  /**
   * Health check method
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: any;
    issues: string[];
  }> {
    const report = performanceOptimizer.generatePerformanceReport();
    const cacheStats = performanceOptimizer.getCacheStatistics();
    
    const issues: string[] = [];
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    // Check response times
    const avgResponseTime = this.calculateAverageResponseTime(report.averageResponseTime);
    if (avgResponseTime > 10000) { // 10 seconds
      issues.push(`High average response time: ${avgResponseTime.toFixed(2)}ms`);
      status = 'unhealthy';
    } else if (avgResponseTime > 5000) { // 5 seconds
      issues.push(`Elevated response time: ${avgResponseTime.toFixed(2)}ms`);
      status = 'degraded';
    }
    
    // Check memory usage
    if (report.memoryUsage.current > 1000) { // 1GB
      issues.push(`High memory usage: ${report.memoryUsage.current.toFixed(2)}MB`);
      status = 'unhealthy';
    } else if (report.memoryUsage.current > 500) { // 500MB
      issues.push(`Elevated memory usage: ${report.memoryUsage.current.toFixed(2)}MB`);
      status = status === 'healthy' ? 'degraded' : status;
    }
    
    // Check cache hit rates
    const avgCacheHitRate = Object.values(report.cacheHitRates).reduce((a, b) => a + b, 0) / Object.keys(report.cacheHitRates).length;
    if (avgCacheHitRate < 0.3) { // Less than 30%
      issues.push(`Low cache hit rate: ${(avgCacheHitRate * 100).toFixed(1)}%`);
      status = status === 'healthy' ? 'degraded' : status;
    }
    
    // Check queue size
    if (report.queueStatus.size > 100) {
      issues.push(`Large processing queue: ${report.queueStatus.size} jobs`);
      status = status === 'healthy' ? 'degraded' : status;
    }
    
    return {
      status,
      metrics: {
        avgResponseTime: avgResponseTime.toFixed(2),
        memoryUsage: report.memoryUsage.current.toFixed(2),
        cacheHitRate: (avgCacheHitRate * 100).toFixed(1),
        queueSize: report.queueStatus.size,
        activeJobs: report.queueStatus.processing
      },
      issues
    };
  }

  /**
   * Cleanup method
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down OptimizedPDFProcessingService...');
    
    // Wait for active jobs to complete or timeout after 30 seconds
    const timeout = 30000;
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const report = performanceOptimizer.generatePerformanceReport();
      if (report.queueStatus.processing === 0) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Destroy performance optimizer
    performanceOptimizer.destroy();
    
    console.log('OptimizedPDFProcessingService shutdown completed');
  }
}

/**
 * Example usage and initialization
 */
export async function initializeOptimizedProcessing(): Promise<OptimizedPDFProcessingService> {
  // Initialize performance optimizer with custom config
  const optimizer = performanceOptimizer;
  
  // Configure for production use
  const config = {
    processing: {
      maxConcurrent: 8,
      memoryThreshold: 0.7,
      queuePriority: true
    },
    caching: {
      textExtraction: { maxSize: 200, ttl: 7200000 }, // 2 hours
      aiResults: { maxSize: 1000, ttl: 3600000 },      // 1 hour
      validation: { maxSize: 2000, ttl: 1800000 },     // 30 minutes
      queryResults: { maxSize: 500, ttl: 600000 }      // 10 minutes
    },
    monitoring: {
      metricsRetention: 172800000, // 48 hours
      alertThresholds: {
        responseTime: 8000,  // 8 seconds
        memoryUsage: 0.8,    // 80%
        errorRate: 0.05      // 5%
      }
    }
  };
  
  // Warm up cache
  await optimizer.warmCache();
  
  // Initialize mock processors (replace with actual implementations)
  const pdfProcessor: PDFProcessor = {
    extractText: async (url: string) => `Mock extracted text for ${url}`
  };
  
  const aiProcessor: AIProcessor = {
    extractCarInfo: async (text: string, prompt: string) => ({
      make: 'Toyota',
      model: 'Camry',
      year: 2020,
      price: 250000
    })
  };
  
  const validator: Validator = {
    validateCarData: async (data: any) => ({
      valid: true,
      data: data as CarListing,
      errors: []
    })
  };
  
  const service = new OptimizedPDFProcessingService(
    pdfProcessor,
    aiProcessor,
    validator
  );
  
  console.log('OptimizedPDFProcessingService initialized successfully');
  
  return service;
}

/**
 * Example usage patterns
 */
export async function demonstrateUsage(): Promise<void> {
  const service = await initializeOptimizedProcessing();
  
  try {
    // 1. Process single PDF
    console.log('Processing single PDF...');
    const result1 = await service.processPDFWithOptimization(
      'https://example.com/car-listing.pdf',
      'job-1',
      { priority: 0.8 }
    );
    console.log('Single PDF result:', result1);
    
    // 2. Process batch of PDFs
    console.log('Processing batch of PDFs...');
    const pdfUrls = [
      'https://example.com/car1.pdf',
      'https://example.com/car2.pdf',
      'https://example.com/car3.pdf'
    ];
    
    const batchResults = await service.processBatchPDFs(pdfUrls, {
      batchSize: 2,
      maxConcurrent: 2,
      priority: 0.6
    });
    console.log(`Batch results: ${batchResults.length} listings processed`);
    
    // 3. Health check
    const health = await service.healthCheck();
    console.log('Health check:', health);
    
  } finally {
    // 4. Graceful shutdown
    await service.shutdown();
  }
}