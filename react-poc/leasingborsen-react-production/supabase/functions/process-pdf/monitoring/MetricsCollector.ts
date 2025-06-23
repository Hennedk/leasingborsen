import { SupabaseClient } from '@supabase/supabase-js';

export interface PerformanceMetrics {
  apiResponseTime: number;
  processingTime: number;
  throughput: number;
  queueLength: number;
}

export interface ResourceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  databaseConnections: number;
  diskUsage: number;
}

export interface ErrorMetrics {
  rate: number;
  count: number;
  types: Record<string, number>;
}

export interface UsageMetrics {
  activeUsers: number;
  requestsPerMinute: number;
  documentsProcessed: number;
}

export interface MetricsSample {
  timestamp: Date;
  metric: string;
  value: number;
  tags?: Record<string, string>;
}

export class MetricsCollector {
  private metricsBuffer: MetricsSample[] = [];
  private collectionInterval?: NodeJS.Timeout;
  private lastCollectionTime = new Date();
  private performanceTracker = new PerformanceTracker();
  private resourceMonitor = new ResourceMonitor();
  private errorTracker = new ErrorTracker();
  private usageTracker = new UsageTracker();

  constructor(private supabase: SupabaseClient) {}

  async startCollection(): Promise<void> {
    console.log('Starting metrics collection...');
    
    // Collect metrics every 30 seconds
    this.collectionInterval = setInterval(async () => {
      await this.collectAllMetrics();
    }, 30000);

    // Initial collection
    await this.collectAllMetrics();
    
    console.log('Metrics collection started');
  }

  async stopCollection(): Promise<void> {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = undefined;
    }

    // Flush remaining metrics
    await this.flushMetrics();
    
    console.log('Metrics collection stopped');
  }

  async collectAllMetrics(): Promise<void> {
    try {
      const timestamp = new Date();
      
      // Collect all metric types in parallel
      await Promise.all([
        this.collectPerformanceMetrics(),
        this.collectResourceMetrics(), 
        this.collectErrorMetrics(),
        this.collectUsageMetrics()
      ]);

      this.lastCollectionTime = timestamp;
      
      // Flush metrics if buffer is large enough
      if (this.metricsBuffer.length >= 50) {
        await this.flushMetrics();
      }
    } catch (error) {
      console.error('Error collecting metrics:', error);
    }
  }

  async collectPerformanceMetrics(): Promise<PerformanceMetrics> {
    const apiResponseTime = await this.measureAPIResponseTime();
    const processingTime = await this.measureProcessingTime();
    const throughput = await this.calculateThroughput();
    const queueLength = await this.getQueueLength();

    const metrics: PerformanceMetrics = {
      apiResponseTime,
      processingTime,
      throughput,
      queueLength
    };

    // Record individual metrics
    this.recordMetric('performance.api_response_time', apiResponseTime);
    this.recordMetric('performance.processing_time', processingTime);
    this.recordMetric('performance.throughput', throughput);
    this.recordMetric('performance.queue_length', queueLength);

    return metrics;
  }

  async collectResourceMetrics(): Promise<ResourceMetrics> {
    const cpuUsage = await this.getCPUUsage();
    const memoryUsage = await this.getMemoryUsage();
    const databaseConnections = await this.getDatabaseConnections();
    const diskUsage = await this.getDiskUsage();

    const metrics: ResourceMetrics = {
      cpuUsage,
      memoryUsage,
      databaseConnections,
      diskUsage
    };

    // Record individual metrics
    this.recordMetric('resources.cpu_usage', cpuUsage);
    this.recordMetric('resources.memory_usage', memoryUsage);
    this.recordMetric('resources.database_connections', databaseConnections);
    this.recordMetric('resources.disk_usage', diskUsage);

    return metrics;
  }

  async collectErrorMetrics(): Promise<ErrorMetrics> {
    const errorData = await this.getErrorData();
    
    const metrics: ErrorMetrics = {
      rate: errorData.rate,
      count: errorData.count,
      types: errorData.types
    };

    // Record individual metrics
    this.recordMetric('errors.rate', errorData.rate);
    this.recordMetric('errors.count', errorData.count);

    // Record error types
    Object.entries(errorData.types).forEach(([type, count]) => {
      this.recordMetric('errors.by_type', count, { type });
    });

    return metrics;
  }

  async collectUsageMetrics(): Promise<UsageMetrics> {
    const activeUsers = await this.getActiveUsers();
    const requestsPerMinute = await this.getRequestsPerMinute();
    const documentsProcessed = await this.getDocumentsProcessed();

    const metrics: UsageMetrics = {
      activeUsers,
      requestsPerMinute,
      documentsProcessed
    };

    // Record individual metrics
    this.recordMetric('usage.active_users', activeUsers);
    this.recordMetric('usage.requests_per_minute', requestsPerMinute);
    this.recordMetric('usage.documents_processed', documentsProcessed);

    return metrics;
  }

  private async measureAPIResponseTime(): Promise<number> {
    const startTime = Date.now();
    
    try {
      // Test a simple API endpoint
      await this.supabase
        .from('processing_jobs')
        .select('count')
        .limit(1);
      
      return Date.now() - startTime;
    } catch (error) {
      console.error('Error measuring API response time:', error);
      return -1; // Indicate error
    }
  }

  private async measureProcessingTime(): Promise<number> {
    try {
      // Get average processing time from recent completed jobs
      const { data, error } = await this.supabase
        .from('processing_jobs')
        .select('created_at, updated_at')
        .eq('status', 'completed')
        .order('updated_at', { ascending: false })
        .limit(10);

      if (error || !data || data.length === 0) {
        return 0;
      }

      const totalTime = data.reduce((sum, job) => {
        const processingTime = new Date(job.updated_at).getTime() - new Date(job.created_at).getTime();
        return sum + processingTime;
      }, 0);

      return totalTime / data.length / 1000; // Convert to seconds
    } catch (error) {
      console.error('Error measuring processing time:', error);
      return 0;
    }
  }

  private async calculateThroughput(): Promise<number> {
    try {
      // Calculate jobs processed per minute
      const oneMinuteAgo = new Date(Date.now() - 60000);
      
      const { data, error } = await this.supabase
        .from('processing_jobs')
        .select('id')
        .eq('status', 'completed')
        .gte('updated_at', oneMinuteAgo.toISOString());

      if (error) {
        console.error('Error calculating throughput:', error);
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Error calculating throughput:', error);
      return 0;
    }
  }

  private async getQueueLength(): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('processing_jobs')
        .select('id')
        .in('status', ['queued', 'pending']);

      if (error) {
        console.error('Error getting queue length:', error);
        return -1;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Error getting queue length:', error);
      return -1;
    }
  }

  private async getCPUUsage(): Promise<number> {
    try {
      // In a real implementation, this would use system monitoring APIs
      // For now, simulate based on queue length and activity
      const queueLength = await this.getQueueLength();
      const baseUsage = 20; // Base CPU usage
      const queueImpact = Math.min(queueLength * 2, 60); // Max 60% from queue
      
      return Math.min(baseUsage + queueImpact + Math.random() * 10, 100);
    } catch (error) {
      console.error('Error getting CPU usage:', error);
      return -1;
    }
  }

  private async getMemoryUsage(): Promise<number> {
    try {
      // Simulate memory usage based on active processes
      const activeJobs = await this.getActiveJobCount();
      const baseMemory = 30; // Base memory usage
      const jobImpact = activeJobs * 3; // 3% per active job
      
      return Math.min(baseMemory + jobImpact + Math.random() * 5, 100);
    } catch (error) {
      console.error('Error getting memory usage:', error);
      return -1;
    }
  }

  private async getDatabaseConnections(): Promise<number> {
    try {
      // In a real implementation, this would query the database for connection count
      // For now, estimate based on activity
      const recentActivity = await this.getRecentActivityCount();
      return Math.max(1, Math.min(recentActivity + 5, 100));
    } catch (error) {
      console.error('Error getting database connections:', error);
      return -1;
    }
  }

  private async getDiskUsage(): Promise<number> {
    try {
      // Simulate disk usage - in real implementation would check actual disk usage
      const fileCount = await this.getFileCount();
      const baseDisk = 40; // Base disk usage
      const fileImpact = Math.min(fileCount * 0.1, 40); // Files impact
      
      return Math.min(baseDisk + fileImpact, 95);
    } catch (error) {
      console.error('Error getting disk usage:', error);
      return -1;
    }
  }

  private async getErrorData(): Promise<{ rate: number; count: number; types: Record<string, number> }> {
    try {
      const oneHourAgo = new Date(Date.now() - 3600000);
      
      // Get errors from the last hour
      const { data: errors, error } = await this.supabase
        .from('error_logs')
        .select('error_type, severity')
        .gte('timestamp', oneHourAgo.toISOString());

      if (error) {
        console.error('Error getting error data:', error);
        return { rate: 0, count: 0, types: {} };
      }

      const totalErrors = errors?.length || 0;
      
      // Calculate error rate (errors per hour)
      const rate = totalErrors;

      // Group by error type
      const types = errors?.reduce((acc, error) => {
        acc[error.error_type] = (acc[error.error_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      return { rate, count: totalErrors, types };
    } catch (error) {
      console.error('Error getting error data:', error);
      return { rate: 0, count: 0, types: {} };
    }
  }

  private async getActiveUsers(): Promise<number> {
    try {
      // Get unique users from recent activity (last hour)
      const oneHourAgo = new Date(Date.now() - 3600000);
      
      const { data, error } = await this.supabase
        .from('processing_jobs')
        .select('user_id')
        .gte('created_at', oneHourAgo.toISOString());

      if (error) {
        console.error('Error getting active users:', error);
        return 0;
      }

      const uniqueUsers = new Set(data?.map(job => job.user_id).filter(Boolean));
      return uniqueUsers.size;
    } catch (error) {
      console.error('Error getting active users:', error);
      return 0;
    }
  }

  private async getRequestsPerMinute(): Promise<number> {
    try {
      const oneMinuteAgo = new Date(Date.now() - 60000);
      
      const { data, error } = await this.supabase
        .from('processing_jobs')
        .select('id')
        .gte('created_at', oneMinuteAgo.toISOString());

      if (error) {
        console.error('Error getting requests per minute:', error);
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Error getting requests per minute:', error);
      return 0;
    }
  }

  private async getDocumentsProcessed(): Promise<number> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const { data, error } = await this.supabase
        .from('processing_jobs')
        .select('id')
        .eq('status', 'completed')
        .gte('updated_at', oneDayAgo.toISOString());

      if (error) {
        console.error('Error getting documents processed:', error);
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Error getting documents processed:', error);
      return 0;
    }
  }

  // Helper methods
  private async getActiveJobCount(): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('processing_jobs')
        .select('id')
        .in('status', ['processing', 'pending']);

      if (error) return 0;
      return data?.length || 0;
    } catch (error) {
      return 0;
    }
  }

  private async getRecentActivityCount(): Promise<number> {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60000);
      
      const { data, error } = await this.supabase
        .from('processing_jobs')
        .select('id')
        .gte('created_at', fiveMinutesAgo.toISOString());

      if (error) return 0;
      return data?.length || 0;
    } catch (error) {
      return 0;
    }
  }

  private async getFileCount(): Promise<number> {
    try {
      // Estimate file count from processing jobs
      const { data, error } = await this.supabase
        .from('processing_jobs')
        .select('id')
        .not('file_path', 'is', null);

      if (error) return 0;
      return data?.length || 0;
    } catch (error) {
      return 0;
    }
  }

  private recordMetric(
    metric: string,
    value: number,
    tags?: Record<string, string>
  ): void {
    this.metricsBuffer.push({
      timestamp: new Date(),
      metric,
      value,
      tags
    });
  }

  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    try {
      // Prepare metrics for database insertion
      const metricsToInsert = this.metricsBuffer.map(sample => ({
        timestamp: sample.timestamp.toISOString(),
        metric_name: sample.metric,
        metric_value: sample.value,
        tags: sample.tags || {}
      }));

      const { error } = await this.supabase
        .from('metrics_samples')
        .insert(metricsToInsert);

      if (error) {
        console.error('Error flushing metrics:', error);
        return;
      }

      console.log(`Flushed ${this.metricsBuffer.length} metrics to database`);
      this.metricsBuffer = [];
    } catch (error) {
      console.error('Error flushing metrics:', error);
    }
  }

  async getCustomMetrics(
    metricName: string,
    startTime: Date,
    endTime: Date,
    aggregation: 'avg' | 'sum' | 'min' | 'max' | 'count' = 'avg'
  ): Promise<MetricsSample[]> {
    try {
      const { data, error } = await this.supabase
        .from('metrics_samples')
        .select('*')
        .eq('metric_name', metricName)
        .gte('timestamp', startTime.toISOString())
        .lte('timestamp', endTime.toISOString())
        .order('timestamp', { ascending: true });

      if (error) throw error;

      return data?.map(row => ({
        timestamp: new Date(row.timestamp),
        metric: row.metric_name,
        value: row.metric_value,
        tags: row.tags
      })) || [];
    } catch (error) {
      console.error('Error getting custom metrics:', error);
      return [];
    }
  }

  async getAggregatedMetrics(
    metricName: string,
    startTime: Date,
    endTime: Date,
    interval: 'minute' | 'hour' | 'day',
    aggregation: 'avg' | 'sum' | 'min' | 'max' = 'avg'
  ): Promise<{ timestamp: Date; value: number }[]> {
    try {
      const samples = await this.getCustomMetrics(metricName, startTime, endTime);
      
      // Group samples by time interval
      const grouped = new Map<string, number[]>();
      
      samples.forEach(sample => {
        const date = new Date(sample.timestamp);
        let key: string;
        
        switch (interval) {
          case 'minute':
            key = date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
            break;
          case 'hour':
            key = date.toISOString().slice(0, 13); // YYYY-MM-DDTHH
            break;
          case 'day':
            key = date.toISOString().slice(0, 10); // YYYY-MM-DD
            break;
        }
        
        if (!grouped.has(key)) {
          grouped.set(key, []);
        }
        grouped.get(key)!.push(sample.value);
      });

      // Aggregate values for each time bucket
      return Array.from(grouped.entries()).map(([key, values]) => {
        let aggregatedValue: number;
        
        switch (aggregation) {
          case 'avg':
            aggregatedValue = values.reduce((a, b) => a + b, 0) / values.length;
            break;
          case 'sum':
            aggregatedValue = values.reduce((a, b) => a + b, 0);
            break;
          case 'min':
            aggregatedValue = Math.min(...values);
            break;
          case 'max':
            aggregatedValue = Math.max(...values);
            break;
        }
        
        return {
          timestamp: new Date(key + (interval === 'day' ? 'T00:00:00Z' : interval === 'hour' ? ':00:00Z' : ':00Z')),
          value: aggregatedValue
        };
      }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    } catch (error) {
      console.error('Error getting aggregated metrics:', error);
      return [];
    }
  }

  async getMetricsSummary(
    metricName: string,
    hours: number = 24
  ): Promise<MetricsSummary> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);
    
    const samples = await this.getCustomMetrics(metricName, startTime, endTime);
    
    if (samples.length === 0) {
      return {
        metricName,
        period: `${hours} hours`,
        sampleCount: 0,
        min: 0,
        max: 0,
        avg: 0,
        latest: 0,
        trend: 'stable'
      };
    }

    const values = samples.map(s => s.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const latest = values[values.length - 1];

    // Calculate trend
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    let trend: 'increasing' | 'decreasing' | 'stable';
    const trendThreshold = avg * 0.1; // 10% threshold
    
    if (secondAvg > firstAvg + trendThreshold) {
      trend = 'increasing';
    } else if (secondAvg < firstAvg - trendThreshold) {
      trend = 'decreasing';
    } else {
      trend = 'stable';
    }

    return {
      metricName,
      period: `${hours} hours`,
      sampleCount: samples.length,
      min,
      max,
      avg,
      latest,
      trend
    };
  }
}

// Helper classes
class PerformanceTracker {
  private requestTimes: number[] = [];
  private maxSamples = 100;

  recordRequestTime(timeMs: number): void {
    this.requestTimes.push(timeMs);
    if (this.requestTimes.length > this.maxSamples) {
      this.requestTimes.shift();
    }
  }

  getAverageResponseTime(): number {
    if (this.requestTimes.length === 0) return 0;
    return this.requestTimes.reduce((a, b) => a + b, 0) / this.requestTimes.length;
  }

  getPercentile(percentile: number): number {
    if (this.requestTimes.length === 0) return 0;
    const sorted = [...this.requestTimes].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }
}

class ResourceMonitor {
  private samples: { cpu: number; memory: number; timestamp: Date }[] = [];
  private maxSamples = 100;

  recordSample(cpu: number, memory: number): void {
    this.samples.push({ cpu, memory, timestamp: new Date() });
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }

  getAverageUsage(): { cpu: number; memory: number } {
    if (this.samples.length === 0) return { cpu: 0, memory: 0 };
    
    const totalCpu = this.samples.reduce((sum, sample) => sum + sample.cpu, 0);
    const totalMemory = this.samples.reduce((sum, sample) => sum + sample.memory, 0);
    
    return {
      cpu: totalCpu / this.samples.length,
      memory: totalMemory / this.samples.length
    };
  }

  getPeakUsage(): { cpu: number; memory: number } {
    if (this.samples.length === 0) return { cpu: 0, memory: 0 };
    
    return {
      cpu: Math.max(...this.samples.map(s => s.cpu)),
      memory: Math.max(...this.samples.map(s => s.memory))
    };
  }
}

class ErrorTracker {
  private errors: { type: string; timestamp: Date; severity: string }[] = [];
  private maxErrors = 1000;

  recordError(type: string, severity: string = 'error'): void {
    this.errors.push({ type, severity, timestamp: new Date() });
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }
  }

  getErrorRate(windowMinutes: number = 60): number {
    const cutoff = new Date(Date.now() - windowMinutes * 60000);
    const recentErrors = this.errors.filter(error => error.timestamp >= cutoff);
    return recentErrors.length / windowMinutes; // Errors per minute
  }

  getErrorsByType(windowMinutes: number = 60): Record<string, number> {
    const cutoff = new Date(Date.now() - windowMinutes * 60000);
    const recentErrors = this.errors.filter(error => error.timestamp >= cutoff);
    
    return recentErrors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}

class UsageTracker {
  private sessions: Map<string, Date> = new Map();
  private requests: { timestamp: Date; userId?: string }[] = [];
  private maxRequests = 10000;

  recordRequest(userId?: string): void {
    this.requests.push({ timestamp: new Date(), userId });
    if (this.requests.length > this.maxRequests) {
      this.requests.shift();
    }

    if (userId) {
      this.sessions.set(userId, new Date());
    }
  }

  getActiveUsers(windowMinutes: number = 30): number {
    const cutoff = new Date(Date.now() - windowMinutes * 60000);
    
    // Clean up old sessions
    for (const [userId, lastSeen] of this.sessions.entries()) {
      if (lastSeen < cutoff) {
        this.sessions.delete(userId);
      }
    }
    
    return this.sessions.size;
  }

  getRequestRate(windowMinutes: number = 5): number {
    const cutoff = new Date(Date.now() - windowMinutes * 60000);
    const recentRequests = this.requests.filter(req => req.timestamp >= cutoff);
    return recentRequests.length / windowMinutes; // Requests per minute
  }
}

// Type definitions
interface MetricsSummary {
  metricName: string;
  period: string;
  sampleCount: number;
  min: number;
  max: number;
  avg: number;
  latest: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}