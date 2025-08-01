import { getEnvironmentConfig, isProduction } from '@/config/environments';

export class EnvironmentSafety {
  /**
   * Prevents dangerous operations in production
   */
  static assertNonProduction(operation?: string) {
    if (isProduction()) {
      const message = operation 
        ? `Operation "${operation}" is not allowed in production environment`
        : 'This operation is not allowed in production environment';
      throw new Error(message);
    }
  }
  
  /**
   * Ensures test dealers are used in test operations
   */
  static assertTestDealer(dealerId: string) {
    const config = getEnvironmentConfig();
    
    // Only enforce in production
    if (config.name !== 'production') return;
    
    if (!dealerId.startsWith('TEST_')) {
      throw new Error(
        `Only TEST_ prefixed dealers allowed in test operations. Got: ${dealerId}`
      );
    }
  }
  
  /**
   * Wraps dangerous operations with safety checks
   */
  static wrapDangerousOperation<T extends (...args: any[]) => any>(
    fn: T,
    operationName: string
  ): T {
    return ((...args: Parameters<T>) => {
      this.assertNonProduction(operationName);
      
      const config = getEnvironmentConfig();
      if (config.features.debugMode) {
        console.warn(`⚠️  Dangerous operation: ${operationName}`);
        console.warn(`📍 Environment: ${config.name}`);
      }
      
      return fn(...args);
    }) as T;
  }
  
  /**
   * Checks if we're in a safe testing environment
   */
  static isSafeTestEnvironment(): boolean {
    const config = getEnvironmentConfig();
    return config.name === 'test' || config.name === 'local';
  }
  
  /**
   * Gets safe test dealer ID
   */
  static getTestDealerId(baseName: string): string {
    return this.isSafeTestEnvironment() 
      ? `TEST_${baseName}_${Date.now()}`
      : `TEST_${baseName}`;
  }

  /**
   * Validates that an operation should use real data or mocks
   */
  static shouldUseMocks(): boolean {
    const config = getEnvironmentConfig();
    return config.name === 'test' || !config.features.aiExtractionEnabled;
  }

  /**
   * Wraps async dangerous operations with safety checks
   */
  static wrapDangerousAsyncOperation<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    operationName: string
  ): T {
    return (async (...args: Parameters<T>) => {
      this.assertNonProduction(operationName);
      
      const config = getEnvironmentConfig();
      if (config.features.debugMode) {
        console.warn(`⚠️  Dangerous async operation: ${operationName}`);
        console.warn(`📍 Environment: ${config.name}`);
      }
      
      return await fn(...args);
    }) as T;
  }

  /**
   * Confirms dangerous operations with user in development
   */
  static async confirmDangerousOperation(
    operationName: string,
    details?: string
  ): Promise<boolean> {
    const config = getEnvironmentConfig();
    
    // Always allow in test environment
    if (config.name === 'test') return true;
    
    // Block in production
    if (config.name === 'production') {
      throw new Error(`Operation "${operationName}" blocked in production`);
    }
    
    // In development, show confirmation if available
    if (typeof window !== 'undefined' && window.confirm) {
      const message = details
        ? `Confirm dangerous operation: ${operationName}\n\n${details}\n\nThis could affect real data. Continue?`
        : `Confirm dangerous operation: ${operationName}\n\nThis could affect real data. Continue?`;
      
      return window.confirm(message);
    }
    
    // If no confirmation mechanism, assume yes in development
    return true;
  }

  /**
   * Log safety warnings for monitoring
   */
  static logSafetyWarning(operation: string, reason: string) {
    const config = getEnvironmentConfig();
    const timestamp = new Date().toISOString();
    
    const warning = {
      timestamp,
      environment: config.name,
      operation,
      reason,
      level: 'WARNING'
    };
    
    console.warn('🚨 SAFETY WARNING:', warning);
    
    // In the future, this could send to monitoring service
    // sendToMonitoring(warning);
  }

  /**
   * Ensure listing IDs are valid before dangerous operations
   */
  static validateListingIds(listingIds: string[]): void {
    if (!Array.isArray(listingIds) || listingIds.length === 0) {
      throw new Error('Invalid listing IDs provided');
    }

    // Check for valid UUID format (basic validation)
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const invalidIds = listingIds.filter(id => !uuidPattern.test(id));
    
    if (invalidIds.length > 0) {
      throw new Error(`Invalid listing ID format: ${invalidIds.join(', ')}`);
    }
  }

  /**
   * Rate limit dangerous operations
   */
  private static operationTimestamps: Map<string, number[]> = new Map();
  
  static checkRateLimit(operation: string, maxOperationsPerMinute: number = 10): void {
    const config = getEnvironmentConfig();
    
    // Skip rate limiting in test environment
    if (config.name === 'test') return;
    
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    const timestamps = this.operationTimestamps.get(operation) || [];
    const recentOperations = timestamps.filter(ts => ts > oneMinuteAgo);
    
    if (recentOperations.length >= maxOperationsPerMinute) {
      throw new Error(
        `Rate limit exceeded for operation "${operation}". ` +
        `Maximum ${maxOperationsPerMinute} operations per minute allowed.`
      );
    }
    
    recentOperations.push(now);
    this.operationTimestamps.set(operation, recentOperations);
  }
}