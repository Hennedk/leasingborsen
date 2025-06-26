import { supabase } from '@/lib/supabase'
import type { 
  ExtractionLog, 
  ExtractedCarData, 
  ExtractionResult, 
  ExtractionError,
  ValidationError
} from '../types'

// Log levels
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

// Log entry interface for structured logging
export interface LogEntry {
  timestamp: Date
  level: LogLevel
  message: string
  metadata?: Record<string, any>
  error?: Error
}

// Logger configuration
export interface LoggerConfig {
  enableConsoleLogging: boolean
  enableDatabaseLogging: boolean
  minLogLevel: LogLevel
  includeStackTrace: boolean
  maxMetadataSize: number
}

// Default configuration
const DEFAULT_CONFIG: LoggerConfig = {
  enableConsoleLogging: true,
  enableDatabaseLogging: true,
  minLogLevel: 'info',
  includeStackTrace: false,
  maxMetadataSize: 10000 // 10KB max for metadata
}

// Log level hierarchy for filtering
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
}

/**
 * ExtractionLogger - Comprehensive logging utility for AI extraction operations
 * 
 * Features:
 * - Structured console and database logging
 * - Cost and performance tracking
 * - Error categorization and analysis
 * - Extraction history queries
 * - Log level filtering
 * - Metadata sanitization
 */
export class ExtractionLogger {
  private config: LoggerConfig
  private context: Record<string, any>

  constructor(config: Partial<LoggerConfig> = {}, context: Record<string, any> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.context = context
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: Record<string, any>): ExtractionLogger {
    return new ExtractionLogger(this.config, { ...this.context, ...additionalContext })
  }

  /**
   * Update logger configuration
   */
  configure(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  // ==================== CORE LOGGING METHODS ====================

  /**
   * Log debug message
   */
  debug(message: string, metadata?: Record<string, any>): void {
    this.log('debug', message, metadata)
  }

  /**
   * Log info message
   */
  info(message: string, metadata?: Record<string, any>): void {
    this.log('info', message, metadata)
  }

  /**
   * Log warning message
   */
  warn(message: string, metadata?: Record<string, any>, error?: Error): void {
    this.log('warn', message, metadata, error)
  }

  /**
   * Log error message
   */
  error(message: string, metadata?: Record<string, any>, error?: Error): void {
    this.log('error', message, metadata, error)
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, metadata?: Record<string, any>, error?: Error): void {
    // Check if this log level should be processed
    if (LOG_LEVELS[level] < LOG_LEVELS[this.config.minLogLevel]) {
      return
    }

    const logEntry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      metadata: this.sanitizeMetadata({ ...this.context, ...metadata }),
      error
    }

    // Console logging
    if (this.config.enableConsoleLogging) {
      this.logToConsole(logEntry)
    }

    // Database logging for significant events
    if (this.config.enableDatabaseLogging && (level === 'warn' || level === 'error')) {
      this.logToDatabase(logEntry).catch(err => {
        console.error('Failed to log to database:', err)
      })
    }
  }

  /**
   * Log to console with proper formatting
   */
  private logToConsole(logEntry: LogEntry): void {
    const { timestamp, level, message, metadata, error } = logEntry
    const timeStr = timestamp.toISOString()
    const contextStr = Object.keys(this.context).length > 0 
      ? ` [${Object.entries(this.context).map(([k, v]) => `${k}=${v}`).join(', ')}]` 
      : ''

    const logLine = `[${timeStr}] ${level.toUpperCase()}${contextStr}: ${message}`

    // Use appropriate console method
    switch (level) {
      case 'debug':
        console.debug(logLine, metadata || {})
        break
      case 'info':
        console.info(logLine, metadata || {})
        break
      case 'warn':
        console.warn(logLine, metadata || {}, error || '')
        break
      case 'error':
        console.error(logLine, metadata || {}, error || '')
        if (error && this.config.includeStackTrace) {
          console.error('Stack trace:', error.stack)
        }
        break
    }
  }

  /**
   * Log significant events to database
   * Note: This creates a temporary log entry since the main extraction_logs table
   * has a different structure. For structured extraction logging, use the specific
   * extraction logging methods instead.
   */
  private async logToDatabase(logEntry: LogEntry): Promise<void> {
    try {
      // Only log extraction-related events to database
      if (!this.isExtractionRelated(logEntry)) {
        return
      }

      // For now, we don't insert generic log entries since the extraction_logs table
      // is specifically designed for extraction tracking. The specific extraction
      // methods (logExtractionStart, logExtractionSuccess, etc.) handle database logging.
      
      // In a production system, you might want a separate general_logs table
      // for non-extraction specific logging.
      
    } catch (err) {
      console.error('Database logging exception:', err)
    }
  }

  /**
   * Check if log entry is extraction-related
   */
  private isExtractionRelated(logEntry: LogEntry): boolean {
    const extractionKeywords = ['extraction', 'pdf', 'ai', 'parse', 'vehicle', 'cost', 'token']
    const text = `${logEntry.message} ${JSON.stringify(logEntry.metadata || {})}`.toLowerCase()
    return extractionKeywords.some(keyword => text.includes(keyword))
  }

  // ==================== EXTRACTION-SPECIFIC LOGGING ====================

  /**
   * Log extraction attempt start
   */
  async logExtractionStart(pdfUrl: string, dealerName?: string, options?: Record<string, any>): Promise<string> {
    const logId = this.generateLogId()
    
    this.info('Extraction started', {
      logId,
      pdfUrl,
      dealerName,
      options
    })

    if (this.config.enableDatabaseLogging) {
      try {
        // Note: The schema requires extraction_status to be one of: 'success', 'failed', 'partial'
        // We'll insert with a placeholder status and update it later
        const { error } = await supabase
          .from('extraction_logs')
          .insert({
            id: logId,
            pdf_url: pdfUrl,
            dealer_name: dealerName,
            extraction_status: 'failed', // Temporary status, will be updated on completion
            cost_cents: 0,
            created_at: new Date().toISOString()
          })

        if (error) {
          this.error('Failed to log extraction start to database', { error: error.message })
        }
      } catch (err) {
        this.error('Exception logging extraction start', { error: err })
      }
    }

    return logId
  }

  /**
   * Log successful extraction
   */
  async logExtractionSuccess(
    logId: string,
    result: ExtractionResult,
    extractedData: ExtractedCarData,
    processingTimeMs: number
  ): Promise<void> {
    const vehicleCount = extractedData.vehicles?.length || 0
    const totalVariants = extractedData.vehicles?.reduce((sum, v) => sum + (v.variants?.length || 0), 0) || 0

    this.info('Extraction completed successfully', {
      logId,
      aiProvider: result.metadata.provider,
      modelVersion: result.metadata.modelVersion,
      vehicleCount,
      totalVariants,
      tokensUsed: result.metadata.tokensUsed,
      costCents: result.metadata.costCents,
      processingTimeMs,
      confidence: result.metadata.confidence
    })

    if (this.config.enableDatabaseLogging) {
      try {
        const { error } = await supabase
          .from('extraction_logs')
          .update({
            extraction_status: 'success',
            ai_provider: result.metadata.provider,
            model_version: result.metadata.modelVersion,
            tokens_input: Math.floor(result.metadata.tokensUsed * 0.7), // Estimate
            tokens_output: Math.floor(result.metadata.tokensUsed * 0.3), // Estimate
            cost_cents: result.metadata.costCents,
            extracted_count: totalVariants,
            processing_time_ms: processingTimeMs,
            retry_count: result.metadata.retryCount || 0,
            raw_response: this.sanitizeForDatabase(result),
            extracted_data: this.sanitizeForDatabase(extractedData)
          })
          .eq('id', logId)

        if (error) {
          this.error('Failed to update extraction success in database', { error: error.message })
        }
      } catch (err) {
        this.error('Exception logging extraction success', { error: err })
      }
    }
  }

  /**
   * Log extraction failure
   */
  async logExtractionFailure(
    logId: string,
    extractionError: ExtractionError,
    processingTimeMs: number,
    aiProvider?: string,
    retryCount?: number
  ): Promise<void> {
    this.error('Extraction failed', {
      logId,
      errorType: extractionError.type,
      errorMessage: extractionError.message,
      retryable: extractionError.retryable,
      processingTimeMs,
      aiProvider,
      retryCount
    })

    if (this.config.enableDatabaseLogging) {
      try {
        const { error } = await supabase
          .from('extraction_logs')
          .update({
            extraction_status: 'failed',
            ai_provider: aiProvider,
            processing_time_ms: processingTimeMs,
            error_message: extractionError.message,
            error_type: extractionError.type,
            retry_count: retryCount || 0,
            raw_response: this.sanitizeForDatabase(extractionError.details)
          })
          .eq('id', logId)

        if (error) {
          this.error('Failed to update extraction failure in database', { error: error.message })
        }
      } catch (err) {
        this.error('Exception logging extraction failure', { error: err })
      }
    }
  }

  /**
   * Log partial extraction (some data extracted but with issues)
   */
  async logExtractionPartial(
    logId: string,
    result: ExtractionResult,
    extractedData: ExtractedCarData,
    validationErrors: ValidationError[],
    processingTimeMs: number
  ): Promise<void> {
    const vehicleCount = extractedData.vehicles?.length || 0
    const errorCount = validationErrors.length

    this.warn('Extraction completed with validation errors', {
      logId,
      aiProvider: result.metadata.provider,
      vehicleCount,
      validationErrorCount: errorCount,
      costCents: result.metadata.costCents,
      processingTimeMs
    })

    if (this.config.enableDatabaseLogging) {
      try {
        const { error } = await supabase
          .from('extraction_logs')
          .update({
            extraction_status: 'partial',
            ai_provider: result.metadata.provider,
            model_version: result.metadata.modelVersion,
            tokens_input: Math.floor(result.metadata.tokensUsed * 0.7),
            tokens_output: Math.floor(result.metadata.tokensUsed * 0.3),
            cost_cents: result.metadata.costCents,
            extracted_count: vehicleCount,
            processing_time_ms: processingTimeMs,
            validation_errors: this.sanitizeForDatabase(validationErrors),
            extracted_data: this.sanitizeForDatabase(extractedData)
          })
          .eq('id', logId)

        if (error) {
          this.error('Failed to update partial extraction in database', { error: error.message })
        }
      } catch (err) {
        this.error('Exception logging partial extraction', { error: err })
      }
    }
  }

  // ==================== COST AND PERFORMANCE TRACKING ====================

  /**
   * Log cost information
   */
  logCost(provider: string, tokensUsed: number, costCents: number, dealerName?: string): void {
    this.info('Cost tracked', {
      provider,
      tokensUsed,
      costCents,
      costUsd: (costCents / 100).toFixed(4),
      dealerName
    })
  }

  /**
   * Log performance metrics
   */
  logPerformance(operation: string, durationMs: number, metadata?: Record<string, any>): void {
    this.info(`Performance: ${operation}`, {
      operation,
      durationMs,
      durationSeconds: (durationMs / 1000).toFixed(2),
      ...metadata
    })
  }

  /**
   * Log retry attempt
   */
  logRetry(attempt: number, maxRetries: number, reason: string, delay?: number): void {
    this.warn(`Retry attempt ${attempt}/${maxRetries}`, {
      attempt,
      maxRetries,
      reason,
      delayMs: delay
    })
  }

  // ==================== QUERY METHODS ====================

  /**
   * Get recent extraction logs
   */
  async getRecentExtractions(limit: number = 50, dealerName?: string): Promise<ExtractionLog[]> {
    try {
      let query = supabase
        .from('extraction_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (dealerName) {
        query = query.eq('dealer_name', dealerName)
      }

      const { data, error } = await query

      if (error) {
        this.error('Failed to fetch recent extractions', { error: error.message })
        return []
      }

      return data || []
    } catch (err) {
      this.error('Exception fetching recent extractions', { error: err })
      return []
    }
  }

  /**
   * Get extraction statistics for a time period
   */
  async getExtractionStats(startDate: Date, endDate: Date): Promise<{
    totalExtractions: number
    successfulExtractions: number
    failedExtractions: number
    partialExtractions: number
    totalCostCents: number
    avgProcessingTimeMs: number
    byProvider: Record<string, number>
    byDealer: Record<string, number>
  }> {
    try {
      const { data, error } = await supabase
        .from('extraction_logs')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      if (error) {
        this.error('Failed to fetch extraction stats', { error: error.message })
        return this.getEmptyStats()
      }

      if (!data || data.length === 0) {
        return this.getEmptyStats()
      }

      // Calculate statistics
      const stats = {
        totalExtractions: data.length,
        successfulExtractions: data.filter(log => log.extraction_status === 'success').length,
        failedExtractions: data.filter(log => log.extraction_status === 'failed').length,
        partialExtractions: data.filter(log => log.extraction_status === 'partial').length,
        totalCostCents: data.reduce((sum, log) => sum + (log.cost_cents || 0), 0),
        avgProcessingTimeMs: data.reduce((sum, log) => sum + (log.processing_time_ms || 0), 0) / data.length,
        byProvider: {} as Record<string, number>,
        byDealer: {} as Record<string, number>
      }

      // Group by provider
      data.forEach(log => {
        if (log.ai_provider) {
          stats.byProvider[log.ai_provider] = (stats.byProvider[log.ai_provider] || 0) + 1
        }
      })

      // Group by dealer
      data.forEach(log => {
        if (log.dealer_name) {
          stats.byDealer[log.dealer_name] = (stats.byDealer[log.dealer_name] || 0) + 1
        }
      })

      return stats
    } catch (err) {
      this.error('Exception calculating extraction stats', { error: err })
      return this.getEmptyStats()
    }
  }

  /**
   * Get cost summary for current day/month
   */
  async getCostSummary(): Promise<{
    dailyTotalCents: number
    monthlyTotalCents: number
    byProvider: Record<string, number>
    byDealer: Record<string, number>
  }> {
    try {
      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      // Get daily costs
      const { data: dailyData } = await supabase
        .from('extraction_logs')
        .select('ai_provider, dealer_name, cost_cents')
        .gte('created_at', startOfDay.toISOString())
        .not('cost_cents', 'is', null)

      // Get monthly costs
      const { data: monthlyData } = await supabase
        .from('extraction_logs')
        .select('ai_provider, dealer_name, cost_cents')
        .gte('created_at', startOfMonth.toISOString())
        .not('cost_cents', 'is', null)

      const summary = {
        dailyTotalCents: dailyData?.reduce((sum, log) => sum + (log.cost_cents || 0), 0) || 0,
        monthlyTotalCents: monthlyData?.reduce((sum, log) => sum + (log.cost_cents || 0), 0) || 0,
        byProvider: {} as Record<string, number>,
        byDealer: {} as Record<string, number>
      }

      // Calculate by provider and dealer from monthly data
      monthlyData?.forEach(log => {
        if (log.ai_provider) {
          summary.byProvider[log.ai_provider] = (summary.byProvider[log.ai_provider] || 0) + (log.cost_cents || 0)
        }
        if (log.dealer_name) {
          summary.byDealer[log.dealer_name] = (summary.byDealer[log.dealer_name] || 0) + (log.cost_cents || 0)
        }
      })

      return summary
    } catch (err) {
      this.error('Exception calculating cost summary', { error: err })
      return {
        dailyTotalCents: 0,
        monthlyTotalCents: 0,
        byProvider: {},
        byDealer: {}
      }
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Generate unique log ID
   */
  private generateLogId(): string {
    return `ext_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Sanitize metadata for logging
   */
  private sanitizeMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
    if (!metadata) return undefined

    const sanitized = { ...metadata }
    
    // Remove sensitive information
    const sensitiveKeys = ['apiKey', 'api_key', 'password', 'token', 'secret', 'auth']
    sensitiveKeys.forEach(key => {
      if (key in sanitized) {
        sanitized[key] = '[REDACTED]'
      }
    })

    // Limit size
    const serialized = JSON.stringify(sanitized)
    if (serialized.length > this.config.maxMetadataSize) {
      return {
        _truncated: true,
        _originalSize: serialized.length,
        _maxSize: this.config.maxMetadataSize,
        _note: 'Metadata truncated due to size limit'
      }
    }

    return sanitized
  }

  /**
   * Sanitize data for database storage
   */
  private sanitizeForDatabase(data: any): any {
    if (!data) return null
    
    try {
      const serialized = JSON.stringify(data)
      // Limit to 1MB for database storage
      if (serialized.length > 1048576) {
        return {
          _truncated: true,
          _originalSize: serialized.length,
          _note: 'Data truncated for database storage'
        }
      }
      return data
    } catch (err) {
      return {
        _error: 'Failed to serialize data',
        _type: typeof data
      }
    }
  }

  /**
   * Get empty stats object
   */
  private getEmptyStats() {
    return {
      totalExtractions: 0,
      successfulExtractions: 0,
      failedExtractions: 0,
      partialExtractions: 0,
      totalCostCents: 0,
      avgProcessingTimeMs: 0,
      byProvider: {},
      byDealer: {}
    }
  }
}

// ==================== FACTORY FUNCTIONS ====================

/**
 * Create a logger for extraction operations
 */
export function createExtractionLogger(dealerName?: string, pdfUrl?: string): ExtractionLogger {
  return new ExtractionLogger({
    enableConsoleLogging: true,
    enableDatabaseLogging: true,
    minLogLevel: 'info'
  }, {
    dealerName,
    pdfUrl
  })
}

/**
 * Create a debug logger with verbose logging
 */
export function createDebugLogger(): ExtractionLogger {
  return new ExtractionLogger({
    enableConsoleLogging: true,
    enableDatabaseLogging: false,
    minLogLevel: 'debug',
    includeStackTrace: true
  })
}

/**
 * Create a production logger with minimal console output
 */
export function createProductionLogger(): ExtractionLogger {
  return new ExtractionLogger({
    enableConsoleLogging: false,
    enableDatabaseLogging: true,
    minLogLevel: 'warn'
  })
}

// ==================== GLOBAL LOGGER INSTANCE ====================

/**
 * Default logger instance for the extraction service
 */
export const extractionLogger = createExtractionLogger()

// Export logger for backward compatibility
export default ExtractionLogger

// ==================== USAGE EXAMPLES ====================

/**
 * Example usage of the ExtractionLogger
 * 
 * Basic logging:
 * ```typescript
 * const logger = createExtractionLogger('Toyota Denmark', 'https://example.com/price-list.pdf')
 * logger.info('Starting extraction process', { documentType: 'price_list' })
 * logger.error('Extraction failed', { reason: 'API timeout' }, new Error('Timeout'))
 * ```
 * 
 * Full extraction workflow:
 * ```typescript
 * const logger = createExtractionLogger('BMW Munich')
 * 
 * // Start extraction and get log ID
 * const logId = await logger.logExtractionStart('https://example.com/bmw-prices.pdf', 'BMW Munich')
 * 
 * try {
 *   // Perform extraction...
 *   const result = await extractCarData(pdfContent)
 *   const processingTime = Date.now() - startTime
 *   
 *   if (result.success) {
 *     await logger.logExtractionSuccess(logId, result, result.data!, processingTime)
 *   } else {
 *     await logger.logExtractionFailure(logId, result.error!, processingTime, 'openai')
 *   }
 * } catch (error) {
 *   await logger.logExtractionFailure(logId, {
 *     type: 'unknown',
 *     message: error.message,
 *     retryable: true
 *   }, Date.now() - startTime, 'openai')
 * }
 * 
 * // Query extraction history
 * const recentExtractions = await logger.getRecentExtractions(10, 'BMW Munich')
 * const stats = await logger.getExtractionStats(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date())
 * const costs = await logger.getCostSummary()
 * ```
 * 
 * Different logger configurations:
 * ```typescript
 * // Debug logger for development
 * const debugLogger = createDebugLogger()
 * debugLogger.debug('Parsing document structure', { pageCount: 15 })
 * 
 * // Production logger with minimal output
 * const prodLogger = createProductionLogger()
 * // Only logs warnings and errors to database
 * 
 * // Custom logger configuration
 * const customLogger = new ExtractionLogger({
 *   enableConsoleLogging: true,
 *   enableDatabaseLogging: false,
 *   minLogLevel: 'warn',
 *   includeStackTrace: true,
 *   maxMetadataSize: 5000
 * }, { service: 'batch-processor', version: '1.2.0' })
 * ```
 */