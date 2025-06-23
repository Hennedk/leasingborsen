import { SupabaseClient } from '@supabase/supabase-js';
import { HealthChecker } from './HealthChecker';
import { AlertManager } from './AlertManager';
import { MetricsCollector } from './MetricsCollector';
import { SLAMonitor } from './SLAMonitor';

export interface MonitoringConfig {
  enableRealTimeMonitoring: boolean;
  metricsRetentionDays: number;
  alertingEnabled: boolean;
  slaTargets: {
    apiResponseTime: number; // milliseconds
    processingTime: number; // seconds
    errorRate: number; // percentage
    uptime: number; // percentage
  };
  resourceThresholds: {
    cpuUsage: number; // percentage
    memoryUsage: number; // percentage
    databaseConnections: number;
    queueDepth: number;
  };
}

export interface SystemMetrics {
  timestamp: Date;
  health: {
    overall: 'healthy' | 'degraded' | 'critical';
    components: Record<string, ComponentHealth>;
  };
  performance: {
    apiResponseTime: number;
    processingTime: number;
    throughput: number;
    queueLength: number;
  };
  resources: {
    cpuUsage: number;
    memoryUsage: number;
    databaseConnections: number;
    diskUsage: number;
  };
  errors: {
    rate: number;
    count: number;
    types: Record<string, number>;
  };
  usage: {
    activeUsers: number;
    requestsPerMinute: number;
    documentsProcessed: number;
  };
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'down';
  lastCheck: Date;
  responseTime: number;
  errorCount: number;
  details?: any;
}

export class ProductionMonitor {
  private healthChecker: HealthChecker;
  private alertManager: AlertManager;
  private metricsCollector: MetricsCollector;
  private slaMonitor: SLAMonitor;
  private monitoringInterval?: NodeJS.Timeout;
  private metricsBuffer: SystemMetrics[] = [];

  constructor(
    private supabase: SupabaseClient,
    private config: MonitoringConfig
  ) {
    this.healthChecker = new HealthChecker(supabase);
    this.alertManager = new AlertManager(config);
    this.metricsCollector = new MetricsCollector(supabase);
    this.slaMonitor = new SLAMonitor(config.slaTargets);
  }

  async startMonitoring(): Promise<void> {
    if (!this.config.enableRealTimeMonitoring) {
      console.log('Real-time monitoring is disabled');
      return;
    }

    console.log('Starting production monitoring...');

    // Initial health check
    await this.performHealthCheck();

    // Start continuous monitoring
    this.monitoringInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 60000); // Check every minute

    // Start metrics collection
    await this.metricsCollector.startCollection();

    // Initialize alert manager
    await this.alertManager.initialize();

    console.log('Production monitoring started successfully');
  }

  async stopMonitoring(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    await this.metricsCollector.stopCollection();
    await this.flushMetrics();

    console.log('Production monitoring stopped');
  }

  async performHealthCheck(): Promise<SystemMetrics> {
    const startTime = Date.now();

    try {
      // Collect all metrics in parallel
      const [
        componentHealth,
        performanceMetrics,
        resourceMetrics,
        errorMetrics,
        usageMetrics
      ] = await Promise.all([
        this.healthChecker.checkAllComponents(),
        this.metricsCollector.collectPerformanceMetrics(),
        this.metricsCollector.collectResourceMetrics(),
        this.metricsCollector.collectErrorMetrics(),
        this.metricsCollector.collectUsageMetrics()
      ]);

      // Determine overall health
      const overallHealth = this.determineOverallHealth(componentHealth);

      const metrics: SystemMetrics = {
        timestamp: new Date(),
        health: {
          overall: overallHealth,
          components: componentHealth
        },
        performance: performanceMetrics,
        resources: resourceMetrics,
        errors: errorMetrics,
        usage: usageMetrics
      };

      // Check SLA compliance
      const slaViolations = this.slaMonitor.checkCompliance(metrics);
      if (slaViolations.length > 0 && this.config.alertingEnabled) {
        await this.alertManager.sendSLAAlert(slaViolations);
      }

      // Check resource thresholds
      await this.checkResourceThresholds(metrics);

      // Buffer metrics for batch storage
      this.metricsBuffer.push(metrics);
      if (this.metricsBuffer.length >= 10) {
        await this.flushMetrics();
      }

      const duration = Date.now() - startTime;
      console.log(`Health check completed in ${duration}ms - Status: ${overallHealth}`);

      return metrics;
    } catch (error) {
      console.error('Error during health check:', error);
      
      if (this.config.alertingEnabled) {
        await this.alertManager.sendCriticalAlert({
          type: 'health_check_failure',
          message: 'Failed to perform health check',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        });
      }

      throw error;
    }
  }

  async getSystemStatus(): Promise<{
    status: SystemMetrics;
    alerts: Alert[];
    slaCompliance: SLAReport;
  }> {
    const status = await this.performHealthCheck();
    const alerts = await this.alertManager.getActiveAlerts();
    const slaCompliance = await this.slaMonitor.generateReport();

    return {
      status,
      alerts,
      slaCompliance
    };
  }

  async getHistoricalMetrics(
    startDate: Date,
    endDate: Date,
    granularity: 'minute' | 'hour' | 'day' = 'hour'
  ): Promise<SystemMetrics[]> {
    const { data, error } = await this.supabase
      .from('system_metrics')
      .select('*')
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString())
      .order('timestamp', { ascending: true });

    if (error) throw error;

    // Aggregate based on granularity
    return this.aggregateMetrics(data || [], granularity);
  }

  async getPerformanceTrends(
    metric: keyof SystemMetrics['performance'],
    days: number = 7
  ): Promise<TrendData> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const metrics = await this.getHistoricalMetrics(startDate, endDate);
    
    return this.calculateTrends(metrics, metric);
  }

  async getErrorAnalysis(days: number = 7): Promise<ErrorAnalysis> {
    const { data, error } = await this.supabase
      .from('error_logs')
      .select('*')
      .gte('timestamp', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: false });

    if (error) throw error;

    return this.analyzeErrors(data || []);
  }

  async getCapacityReport(): Promise<CapacityReport> {
    const currentMetrics = await this.performHealthCheck();
    const historicalMetrics = await this.getHistoricalMetrics(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      new Date()
    );

    return this.generateCapacityReport(currentMetrics, historicalMetrics);
  }

  private determineOverallHealth(
    components: Record<string, ComponentHealth>
  ): 'healthy' | 'degraded' | 'critical' {
    const statuses = Object.values(components).map(c => c.status);
    
    if (statuses.some(s => s === 'down')) {
      return 'critical';
    }
    
    if (statuses.some(s => s === 'degraded')) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  private async checkResourceThresholds(metrics: SystemMetrics): Promise<void> {
    const { resources } = metrics;
    const { resourceThresholds } = this.config;
    const violations: ResourceViolation[] = [];

    if (resources.cpuUsage > resourceThresholds.cpuUsage) {
      violations.push({
        resource: 'CPU',
        current: resources.cpuUsage,
        threshold: resourceThresholds.cpuUsage,
        severity: resources.cpuUsage > 90 ? 'critical' : 'warning'
      });
    }

    if (resources.memoryUsage > resourceThresholds.memoryUsage) {
      violations.push({
        resource: 'Memory',
        current: resources.memoryUsage,
        threshold: resourceThresholds.memoryUsage,
        severity: resources.memoryUsage > 90 ? 'critical' : 'warning'
      });
    }

    if (resources.databaseConnections > resourceThresholds.databaseConnections) {
      violations.push({
        resource: 'Database Connections',
        current: resources.databaseConnections,
        threshold: resourceThresholds.databaseConnections,
        severity: 'warning'
      });
    }

    if (violations.length > 0 && this.config.alertingEnabled) {
      await this.alertManager.sendResourceAlert(violations);
    }
  }

  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    try {
      const { error } = await this.supabase
        .from('system_metrics')
        .insert(this.metricsBuffer);

      if (error) throw error;

      console.log(`Flushed ${this.metricsBuffer.length} metrics to database`);
      this.metricsBuffer = [];

      // Clean up old metrics
      await this.cleanupOldMetrics();
    } catch (error) {
      console.error('Error flushing metrics:', error);
    }
  }

  private async cleanupOldMetrics(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.metricsRetentionDays);

    const { error } = await this.supabase
      .from('system_metrics')
      .delete()
      .lt('timestamp', cutoffDate.toISOString());

    if (error) {
      console.error('Error cleaning up old metrics:', error);
    }
  }

  private aggregateMetrics(
    metrics: any[],
    granularity: 'minute' | 'hour' | 'day'
  ): SystemMetrics[] {
    // Implementation of metric aggregation based on granularity
    const aggregated: Map<string, SystemMetrics[]> = new Map();
    
    metrics.forEach(metric => {
      const date = new Date(metric.timestamp);
      let key: string;
      
      switch (granularity) {
        case 'minute':
          key = `${date.toISOString().slice(0, 16)}`;
          break;
        case 'hour':
          key = `${date.toISOString().slice(0, 13)}`;
          break;
        case 'day':
          key = `${date.toISOString().slice(0, 10)}`;
          break;
      }
      
      if (!aggregated.has(key)) {
        aggregated.set(key, []);
      }
      aggregated.get(key)!.push(metric);
    });

    // Average the metrics for each time bucket
    return Array.from(aggregated.entries()).map(([key, metrics]) => {
      return this.averageMetrics(metrics);
    });
  }

  private averageMetrics(metrics: SystemMetrics[]): SystemMetrics {
    // Calculate averages for all numeric metrics
    const averaged: any = {
      timestamp: new Date(metrics[0].timestamp),
      health: {
        overall: this.mostCommonStatus(metrics.map(m => m.health.overall)),
        components: {} // Simplified for now
      },
      performance: {
        apiResponseTime: this.average(metrics.map(m => m.performance.apiResponseTime)),
        processingTime: this.average(metrics.map(m => m.performance.processingTime)),
        throughput: this.sum(metrics.map(m => m.performance.throughput)),
        queueLength: this.average(metrics.map(m => m.performance.queueLength))
      },
      resources: {
        cpuUsage: this.average(metrics.map(m => m.resources.cpuUsage)),
        memoryUsage: this.average(metrics.map(m => m.resources.memoryUsage)),
        databaseConnections: this.average(metrics.map(m => m.resources.databaseConnections)),
        diskUsage: this.average(metrics.map(m => m.resources.diskUsage))
      },
      errors: {
        rate: this.average(metrics.map(m => m.errors.rate)),
        count: this.sum(metrics.map(m => m.errors.count)),
        types: this.mergeErrorTypes(metrics.map(m => m.errors.types))
      },
      usage: {
        activeUsers: this.max(metrics.map(m => m.usage.activeUsers)),
        requestsPerMinute: this.average(metrics.map(m => m.usage.requestsPerMinute)),
        documentsProcessed: this.sum(metrics.map(m => m.usage.documentsProcessed))
      }
    };

    return averaged;
  }

  private average(numbers: number[]): number {
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  private sum(numbers: number[]): number {
    return numbers.reduce((a, b) => a + b, 0);
  }

  private max(numbers: number[]): number {
    return Math.max(...numbers);
  }

  private mostCommonStatus(statuses: string[]): any {
    const counts = statuses.reduce((acc, status) => {
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }

  private mergeErrorTypes(errorTypes: Record<string, number>[]): Record<string, number> {
    const merged: Record<string, number> = {};
    
    errorTypes.forEach(types => {
      Object.entries(types).forEach(([type, count]) => {
        merged[type] = (merged[type] || 0) + count;
      });
    });

    return merged;
  }

  private calculateTrends(metrics: SystemMetrics[], metric: string): TrendData {
    const values = metrics.map(m => {
      const keys = metric.split('.');
      let value: any = m;
      for (const key of keys) {
        value = value[key];
      }
      return {
        timestamp: m.timestamp,
        value: value as number
      };
    });

    const trend = this.calculateTrendLine(values);
    const forecast = this.forecastValues(values, 7); // 7 day forecast

    return {
      historical: values,
      trend,
      forecast,
      analysis: this.analyzeTrend(trend)
    };
  }

  private calculateTrendLine(values: { timestamp: Date; value: number }[]): TrendLine {
    // Simple linear regression
    const n = values.length;
    const x = values.map((_, i) => i);
    const y = values.map(v => v.value);

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  private forecastValues(
    values: { timestamp: Date; value: number }[],
    days: number
  ): { timestamp: Date; value: number; confidence: number }[] {
    const trend = this.calculateTrendLine(values);
    const lastIndex = values.length - 1;
    const forecast = [];

    for (let i = 1; i <= days; i++) {
      const futureDate = new Date(values[lastIndex].timestamp);
      futureDate.setDate(futureDate.getDate() + i);
      
      const predictedValue = trend.slope * (lastIndex + i) + trend.intercept;
      const confidence = Math.max(0, 100 - i * 5); // Decrease confidence over time

      forecast.push({
        timestamp: futureDate,
        value: Math.max(0, predictedValue),
        confidence
      });
    }

    return forecast;
  }

  private analyzeTrend(trend: TrendLine): TrendAnalysis {
    const direction = trend.slope > 0.1 ? 'increasing' : 
                     trend.slope < -0.1 ? 'decreasing' : 'stable';
    
    const severity = Math.abs(trend.slope) > 10 ? 'high' :
                    Math.abs(trend.slope) > 5 ? 'medium' : 'low';

    return {
      direction,
      severity,
      recommendation: this.getTrendRecommendation(direction, severity)
    };
  }

  private getTrendRecommendation(direction: string, severity: string): string {
    if (direction === 'increasing' && severity === 'high') {
      return 'Immediate attention required - rapid increase detected';
    } else if (direction === 'decreasing' && severity === 'high') {
      return 'Investigate cause of rapid decrease';
    } else if (direction === 'stable') {
      return 'System performing within normal parameters';
    }
    return 'Continue monitoring';
  }

  private analyzeErrors(errors: any[]): ErrorAnalysis {
    const errorsByType = this.groupErrorsByType(errors);
    const errorsByTime = this.groupErrorsByTime(errors);
    const topErrors = this.getTopErrors(errors);
    const errorPatterns = this.detectErrorPatterns(errors);

    return {
      totalErrors: errors.length,
      errorsByType,
      errorsByTime,
      topErrors,
      patterns: errorPatterns,
      recommendations: this.getErrorRecommendations(errorPatterns)
    };
  }

  private groupErrorsByType(errors: any[]): Record<string, number> {
    return errors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {});
  }

  private groupErrorsByTime(errors: any[]): TimeSeriesData[] {
    const hourly = new Map<string, number>();
    
    errors.forEach(error => {
      const hour = new Date(error.timestamp).toISOString().slice(0, 13);
      hourly.set(hour, (hourly.get(hour) || 0) + 1);
    });

    return Array.from(hourly.entries()).map(([time, count]) => ({
      timestamp: new Date(time + ':00:00Z'),
      value: count
    }));
  }

  private getTopErrors(errors: any[], limit: number = 10): TopError[] {
    const errorCounts = new Map<string, number>();
    const errorExamples = new Map<string, any>();

    errors.forEach(error => {
      const key = `${error.type}:${error.message}`;
      errorCounts.set(key, (errorCounts.get(key) || 0) + 1);
      if (!errorExamples.has(key)) {
        errorExamples.set(key, error);
      }
    });

    return Array.from(errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([key, count]) => {
        const example = errorExamples.get(key)!;
        return {
          type: example.type,
          message: example.message,
          count,
          lastOccurrence: example.timestamp,
          severity: this.getErrorSeverity(example)
        };
      });
  }

  private detectErrorPatterns(errors: any[]): ErrorPattern[] {
    const patterns: ErrorPattern[] = [];

    // Detect burst patterns
    const bursts = this.detectErrorBursts(errors);
    if (bursts.length > 0) {
      patterns.push({
        type: 'burst',
        description: 'Error bursts detected',
        occurrences: bursts
      });
    }

    // Detect recurring patterns
    const recurring = this.detectRecurringErrors(errors);
    if (recurring.length > 0) {
      patterns.push({
        type: 'recurring',
        description: 'Recurring error patterns detected',
        occurrences: recurring
      });
    }

    return patterns;
  }

  private detectErrorBursts(errors: any[]): ErrorBurst[] {
    const bursts: ErrorBurst[] = [];
    const threshold = 10; // errors per minute
    const window = 60000; // 1 minute

    let currentBurst: any[] = [];
    let burstStart: Date | null = null;

    errors.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    errors.forEach(error => {
      const errorTime = new Date(error.timestamp);
      
      if (!burstStart || errorTime.getTime() - burstStart.getTime() > window) {
        if (currentBurst.length >= threshold) {
          bursts.push({
            start: burstStart!,
            end: new Date(currentBurst[currentBurst.length - 1].timestamp),
            count: currentBurst.length,
            types: [...new Set(currentBurst.map(e => e.type))]
          });
        }
        currentBurst = [error];
        burstStart = errorTime;
      } else {
        currentBurst.push(error);
      }
    });

    return bursts;
  }

  private detectRecurringErrors(errors: any[]): RecurringError[] {
    // Group errors by hour of day
    const hourlyPatterns = new Map<number, number>();
    
    errors.forEach(error => {
      const hour = new Date(error.timestamp).getHours();
      hourlyPatterns.set(hour, (hourlyPatterns.get(hour) || 0) + 1);
    });

    // Find hours with significantly higher error rates
    const avgErrorsPerHour = errors.length / 24;
    const threshold = avgErrorsPerHour * 2; // 2x average

    return Array.from(hourlyPatterns.entries())
      .filter(([_, count]) => count > threshold)
      .map(([hour, count]) => ({
        pattern: `High error rate at ${hour}:00`,
        frequency: count,
        lastOccurrence: new Date()
      }));
  }

  private getErrorSeverity(error: any): 'low' | 'medium' | 'high' | 'critical' {
    if (error.type === 'system_failure' || error.type === 'database_connection') {
      return 'critical';
    } else if (error.type === 'api_error' || error.type === 'processing_error') {
      return 'high';
    } else if (error.type === 'validation_error') {
      return 'medium';
    }
    return 'low';
  }

  private getErrorRecommendations(patterns: ErrorPattern[]): string[] {
    const recommendations: string[] = [];

    patterns.forEach(pattern => {
      if (pattern.type === 'burst') {
        recommendations.push('Implement rate limiting to prevent error bursts');
        recommendations.push('Add circuit breakers for failing services');
      } else if (pattern.type === 'recurring') {
        recommendations.push('Schedule maintenance during low-error periods');
        recommendations.push('Investigate root cause of recurring errors');
      }
    });

    return [...new Set(recommendations)];
  }

  private generateCapacityReport(
    current: SystemMetrics,
    historical: SystemMetrics[]
  ): CapacityReport {
    const growthRate = this.calculateGrowthRate(historical);
    const peakUsage = this.calculatePeakUsage(historical);
    const projections = this.projectCapacityNeeds(current, growthRate);

    return {
      currentCapacity: {
        cpu: 100 - current.resources.cpuUsage,
        memory: 100 - current.resources.memoryUsage,
        storage: 100 - current.resources.diskUsage,
        throughput: this.calculateMaxThroughput(current)
      },
      peakUsage,
      growthRate,
      projections,
      recommendations: this.getCapacityRecommendations(current, projections)
    };
  }

  private calculateGrowthRate(historical: SystemMetrics[]): GrowthMetrics {
    const firstWeek = historical.slice(0, 7);
    const lastWeek = historical.slice(-7);

    return {
      users: this.calculatePercentageGrowth(
        this.average(firstWeek.map(m => m.usage.activeUsers)),
        this.average(lastWeek.map(m => m.usage.activeUsers))
      ),
      requests: this.calculatePercentageGrowth(
        this.average(firstWeek.map(m => m.usage.requestsPerMinute)),
        this.average(lastWeek.map(m => m.usage.requestsPerMinute))
      ),
      storage: this.calculatePercentageGrowth(
        this.average(firstWeek.map(m => m.resources.diskUsage)),
        this.average(lastWeek.map(m => m.resources.diskUsage))
      )
    };
  }

  private calculatePercentageGrowth(oldValue: number, newValue: number): number {
    if (oldValue === 0) return 0;
    return ((newValue - oldValue) / oldValue) * 100;
  }

  private calculatePeakUsage(historical: SystemMetrics[]): PeakUsageMetrics {
    return {
      cpu: this.max(historical.map(m => m.resources.cpuUsage)),
      memory: this.max(historical.map(m => m.resources.memoryUsage)),
      requests: this.max(historical.map(m => m.usage.requestsPerMinute)),
      timestamp: new Date() // Simplified - should find actual peak time
    };
  }

  private calculateMaxThroughput(current: SystemMetrics): number {
    // Estimate based on current resource usage
    const cpuCapacity = (100 - current.resources.cpuUsage) / 100;
    const memoryCapacity = (100 - current.resources.memoryUsage) / 100;
    const currentThroughput = current.performance.throughput;

    const limitingFactor = Math.min(cpuCapacity, memoryCapacity);
    return currentThroughput / (1 - limitingFactor);
  }

  private projectCapacityNeeds(
    current: SystemMetrics,
    growthRate: GrowthMetrics
  ): CapacityProjection[] {
    const projections: CapacityProjection[] = [];
    const periods = [30, 90, 180, 365]; // days

    periods.forEach(days => {
      const growthFactor = Math.pow(1 + growthRate.users / 100, days / 30);
      
      projections.push({
        period: `${days} days`,
        expectedLoad: {
          users: Math.round(current.usage.activeUsers * growthFactor),
          requests: Math.round(current.usage.requestsPerMinute * growthFactor),
          storage: current.resources.diskUsage * growthFactor
        },
        requiredResources: {
          cpu: Math.min(100, current.resources.cpuUsage * growthFactor),
          memory: Math.min(100, current.resources.memoryUsage * growthFactor),
          storage: current.resources.diskUsage * growthFactor
        }
      });
    });

    return projections;
  }

  private getCapacityRecommendations(
    current: SystemMetrics,
    projections: CapacityProjection[]
  ): string[] {
    const recommendations: string[] = [];

    // Check current capacity
    if (current.resources.cpuUsage > 80) {
      recommendations.push('CPU usage is high - consider scaling up compute resources');
    }
    if (current.resources.memoryUsage > 80) {
      recommendations.push('Memory usage is high - consider increasing memory allocation');
    }

    // Check projections
    const projection90Days = projections.find(p => p.period === '90 days');
    if (projection90Days) {
      if (projection90Days.requiredResources.cpu > 90) {
        recommendations.push('CPU capacity will be exceeded within 90 days - plan for scaling');
      }
      if (projection90Days.requiredResources.memory > 90) {
        recommendations.push('Memory capacity will be exceeded within 90 days - plan for upgrade');
      }
    }

    return recommendations;
  }
}

// Type definitions
interface Alert {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

interface SLAReport {
  period: string;
  compliance: {
    uptime: { target: number; actual: number; compliant: boolean };
    responseTime: { target: number; actual: number; compliant: boolean };
    errorRate: { target: number; actual: number; compliant: boolean };
  };
  violations: SLAViolation[];
}

interface SLAViolation {
  metric: string;
  target: number;
  actual: number;
  duration: number;
  timestamp: Date;
}

interface ResourceViolation {
  resource: string;
  current: number;
  threshold: number;
  severity: 'warning' | 'critical';
}

interface TrendData {
  historical: { timestamp: Date; value: number }[];
  trend: TrendLine;
  forecast: { timestamp: Date; value: number; confidence: number }[];
  analysis: TrendAnalysis;
}

interface TrendLine {
  slope: number;
  intercept: number;
}

interface TrendAnalysis {
  direction: 'increasing' | 'decreasing' | 'stable';
  severity: 'low' | 'medium' | 'high';
  recommendation: string;
}

interface ErrorAnalysis {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsByTime: TimeSeriesData[];
  topErrors: TopError[];
  patterns: ErrorPattern[];
  recommendations: string[];
}

interface TimeSeriesData {
  timestamp: Date;
  value: number;
}

interface TopError {
  type: string;
  message: string;
  count: number;
  lastOccurrence: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface ErrorPattern {
  type: 'burst' | 'recurring' | 'correlated';
  description: string;
  occurrences: any[];
}

interface ErrorBurst {
  start: Date;
  end: Date;
  count: number;
  types: string[];
}

interface RecurringError {
  pattern: string;
  frequency: number;
  lastOccurrence: Date;
}

interface CapacityReport {
  currentCapacity: {
    cpu: number;
    memory: number;
    storage: number;
    throughput: number;
  };
  peakUsage: PeakUsageMetrics;
  growthRate: GrowthMetrics;
  projections: CapacityProjection[];
  recommendations: string[];
}

interface PeakUsageMetrics {
  cpu: number;
  memory: number;
  requests: number;
  timestamp: Date;
}

interface GrowthMetrics {
  users: number;
  requests: number;
  storage: number;
}

interface CapacityProjection {
  period: string;
  expectedLoad: {
    users: number;
    requests: number;
    storage: number;
  };
  requiredResources: {
    cpu: number;
    memory: number;
    storage: number;
  };
}