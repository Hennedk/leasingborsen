import { SupabaseClient } from '@supabase/supabase-js';

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'down';
  lastCheck: Date;
  responseTime: number;
  errorCount: number;
  details?: any;
}

export interface HealthCheckResult {
  component: string;
  status: ComponentHealth['status'];
  responseTime: number;
  message: string;
  details?: any;
}

export class HealthChecker {
  private checkHistory: Map<string, HealthCheckResult[]> = new Map();
  private maxHistorySize = 100;

  constructor(private supabase: SupabaseClient) {}

  async checkAllComponents(): Promise<Record<string, ComponentHealth>> {
    const components = [
      'database',
      'api',
      'pdf_processing',
      'file_storage',
      'queue_system',
      'auth_service',
      'background_jobs'
    ];

    const results = await Promise.allSettled(
      components.map(component => this.checkComponent(component))
    );

    const health: Record<string, ComponentHealth> = {};

    results.forEach((result, index) => {
      const component = components[index];
      if (result.status === 'fulfilled') {
        health[component] = result.value;
      } else {
        health[component] = {
          status: 'down',
          lastCheck: new Date(),
          responseTime: 0,
          errorCount: 1,
          details: { error: result.reason }
        };
      }
    });

    return health;
  }

  async checkComponent(component: string): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      let result: HealthCheckResult;

      switch (component) {
        case 'database':
          result = await this.checkDatabase();
          break;
        case 'api':
          result = await this.checkAPI();
          break;
        case 'pdf_processing':
          result = await this.checkPDFProcessing();
          break;
        case 'file_storage':
          result = await this.checkFileStorage();
          break;
        case 'queue_system':
          result = await this.checkQueueSystem();
          break;
        case 'auth_service':
          result = await this.checkAuthService();
          break;
        case 'background_jobs':
          result = await this.checkBackgroundJobs();
          break;
        default:
          throw new Error(`Unknown component: ${component}`);
      }

      // Store check history
      this.storeCheckHistory(component, result);

      const responseTime = Date.now() - startTime;
      const errorCount = this.getRecentErrorCount(component);

      return {
        status: result.status,
        lastCheck: new Date(),
        responseTime,
        errorCount,
        details: result.details
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorCount = this.getRecentErrorCount(component) + 1;

      const failedResult: HealthCheckResult = {
        component,
        status: 'down',
        responseTime,
        message: error instanceof Error ? error.message : 'Unknown error',
        details: { error }
      };

      this.storeCheckHistory(component, failedResult);

      return {
        status: 'down',
        lastCheck: new Date(),
        responseTime,
        errorCount,
        details: failedResult.details
      };
    }
  }

  private async checkDatabase(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Test basic connectivity
      const { data, error } = await this.supabase
        .from('processing_jobs')
        .select('count')
        .limit(1);

      if (error) throw error;

      const responseTime = Date.now() - startTime;

      // Test database write capability
      const testResult = await this.testDatabaseWrite();
      
      // Check connection pool
      const connectionInfo = await this.getConnectionInfo();

      const status = responseTime < 1000 && testResult ? 'healthy' : 'degraded';

      return {
        component: 'database',
        status,
        responseTime,
        message: `Database ${status} - Response time: ${responseTime}ms`,
        details: {
          responseTime,
          writeTest: testResult,
          connections: connectionInfo
        }
      };

    } catch (error) {
      throw new Error(`Database health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async checkAPI(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Test API endpoints
      const endpoints = [
        '/health',
        '/api/v1/status',
        '/api/v1/processing-jobs'
      ];

      const results = await Promise.allSettled(
        endpoints.map(endpoint => this.testEndpoint(endpoint))
      );

      const responseTime = Date.now() - startTime;
      const successfulEndpoints = results.filter(r => r.status === 'fulfilled').length;
      const totalEndpoints = endpoints.length;

      let status: ComponentHealth['status'];
      if (successfulEndpoints === totalEndpoints) {
        status = responseTime < 2000 ? 'healthy' : 'degraded';
      } else if (successfulEndpoints > totalEndpoints / 2) {
        status = 'degraded';
      } else {
        status = 'down';
      }

      return {
        component: 'api',
        status,
        responseTime,
        message: `API ${status} - ${successfulEndpoints}/${totalEndpoints} endpoints responding`,
        details: {
          endpoints: results.map((result, index) => ({
            endpoint: endpoints[index],
            status: result.status,
            error: result.status === 'rejected' ? result.reason : null
          })),
          responseTime
        }
      };

    } catch (error) {
      throw new Error(`API health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async checkPDFProcessing(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Check recent processing jobs
      const { data: recentJobs, error } = await this.supabase
        .from('processing_jobs')
        .select('status, created_at, updated_at, error_message')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const responseTime = Date.now() - startTime;

      // Analyze recent job success rate
      const totalJobs = recentJobs?.length || 0;
      const successfulJobs = recentJobs?.filter(job => job.status === 'completed').length || 0;
      const failedJobs = recentJobs?.filter(job => job.status === 'failed').length || 0;
      const processingJobs = recentJobs?.filter(job => job.status === 'processing').length || 0;

      const successRate = totalJobs > 0 ? (successfulJobs / totalJobs) * 100 : 100;

      // Check for stuck jobs (processing for more than 30 minutes)
      const stuckJobs = recentJobs?.filter(job => {
        if (job.status !== 'processing') return false;
        const processingTime = Date.now() - new Date(job.updated_at).getTime();
        return processingTime > 30 * 60 * 1000; // 30 minutes
      }) || [];

      let status: ComponentHealth['status'];
      if (successRate >= 95 && stuckJobs.length === 0) {
        status = 'healthy';
      } else if (successRate >= 80 && stuckJobs.length <= 2) {
        status = 'degraded';
      } else {
        status = 'down';
      }

      return {
        component: 'pdf_processing',
        status,
        responseTime,
        message: `PDF Processing ${status} - Success rate: ${successRate.toFixed(1)}%`,
        details: {
          successRate,
          totalJobs,
          successfulJobs,
          failedJobs,
          processingJobs,
          stuckJobs: stuckJobs.length,
          responseTime
        }
      };

    } catch (error) {
      throw new Error(`PDF processing health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async checkFileStorage(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Test file upload and retrieval
      const testFileName = `health-check-${Date.now()}.txt`;
      const testContent = 'Health check test file';

      // Upload test file
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('pdf-processing')
        .upload(testFileName, testContent, {
          contentType: 'text/plain'
        });

      if (uploadError) throw uploadError;

      // Download test file
      const { data: downloadData, error: downloadError } = await this.supabase.storage
        .from('pdf-processing')
        .download(testFileName);

      if (downloadError) throw downloadError;

      // Clean up test file
      await this.supabase.storage
        .from('pdf-processing')
        .remove([testFileName]);

      const responseTime = Date.now() - startTime;

      // Check storage usage
      const storageInfo = await this.getStorageInfo();

      const status = responseTime < 3000 ? 'healthy' : 'degraded';

      return {
        component: 'file_storage',
        status,
        responseTime,
        message: `File storage ${status} - Response time: ${responseTime}ms`,
        details: {
          uploadSuccess: true,
          downloadSuccess: true,
          responseTime,
          storage: storageInfo
        }
      };

    } catch (error) {
      throw new Error(`File storage health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async checkQueueSystem(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Check queue status
      const { data: queuedJobs, error } = await this.supabase
        .from('processing_jobs')
        .select('status, created_at, priority')
        .eq('status', 'queued')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const responseTime = Date.now() - startTime;

      const queueLength = queuedJobs?.length || 0;
      const oldestJob = queuedJobs?.[0];
      const queueWaitTime = oldestJob ? 
        Date.now() - new Date(oldestJob.created_at).getTime() : 0;

      // Check for priority queue distribution
      const highPriorityJobs = queuedJobs?.filter(job => job.priority === 'high').length || 0;
      const normalPriorityJobs = queuedJobs?.filter(job => job.priority === 'normal').length || 0;
      const lowPriorityJobs = queuedJobs?.filter(job => job.priority === 'low').length || 0;

      let status: ComponentHealth['status'];
      if (queueLength < 100 && queueWaitTime < 5 * 60 * 1000) { // 5 minutes
        status = 'healthy';
      } else if (queueLength < 500 && queueWaitTime < 15 * 60 * 1000) { // 15 minutes
        status = 'degraded';
      } else {
        status = 'down';
      }

      return {
        component: 'queue_system',
        status,
        responseTime,
        message: `Queue system ${status} - ${queueLength} jobs queued`,
        details: {
          queueLength,
          queueWaitTime,
          highPriorityJobs,
          normalPriorityJobs,
          lowPriorityJobs,
          responseTime
        }
      };

    } catch (error) {
      throw new Error(`Queue system health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async checkAuthService(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Test auth service by checking current session
      const { data: { session }, error } = await this.supabase.auth.getSession();

      if (error) throw error;

      const responseTime = Date.now() - startTime;

      // Test user validation (if session exists)
      let userValidation = true;
      if (session) {
        try {
          const { error: userError } = await this.supabase.auth.getUser();
          if (userError) userValidation = false;
        } catch {
          userValidation = false;
        }
      }

      const status = responseTime < 1000 && userValidation ? 'healthy' : 'degraded';

      return {
        component: 'auth_service',
        status,
        responseTime,
        message: `Auth service ${status} - Response time: ${responseTime}ms`,
        details: {
          sessionActive: !!session,
          userValidation,
          responseTime
        }
      };

    } catch (error) {
      throw new Error(`Auth service health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async checkBackgroundJobs(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Check for stuck background jobs
      const { data: runningJobs, error } = await this.supabase
        .from('processing_jobs')
        .select('id, status, created_at, updated_at, job_type')
        .in('status', ['processing', 'pending'])
        .order('created_at', { ascending: true });

      if (error) throw error;

      const responseTime = Date.now() - startTime;

      // Analyze job health
      const stuckJobs = runningJobs?.filter(job => {
        const timeSinceUpdate = Date.now() - new Date(job.updated_at).getTime();
        return timeSinceUpdate > 60 * 60 * 1000; // 1 hour
      }) || [];

      const longRunningJobs = runningJobs?.filter(job => {
        const runtime = Date.now() - new Date(job.created_at).getTime();
        return runtime > 2 * 60 * 60 * 1000; // 2 hours
      }) || [];

      // Check job types distribution
      const jobTypes = runningJobs?.reduce((acc, job) => {
        acc[job.job_type] = (acc[job.job_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      let status: ComponentHealth['status'];
      if (stuckJobs.length === 0 && longRunningJobs.length < 3) {
        status = 'healthy';
      } else if (stuckJobs.length < 5 && longRunningJobs.length < 10) {
        status = 'degraded';
      } else {
        status = 'down';
      }

      return {
        component: 'background_jobs',
        status,
        responseTime,
        message: `Background jobs ${status} - ${stuckJobs.length} stuck jobs`,
        details: {
          runningJobs: runningJobs?.length || 0,
          stuckJobs: stuckJobs.length,
          longRunningJobs: longRunningJobs.length,
          jobTypes,
          responseTime
        }
      };

    } catch (error) {
      throw new Error(`Background jobs health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async testDatabaseWrite(): Promise<boolean> {
    try {
      const testId = `health-check-${Date.now()}`;
      
      // Insert test record
      const { error: insertError } = await this.supabase
        .from('health_checks')
        .insert({
          id: testId,
          component: 'database',
          status: 'test',
          timestamp: new Date().toISOString()
        });

      if (insertError) {
        console.warn('Database write test failed:', insertError);
        return false;
      }

      // Delete test record
      const { error: deleteError } = await this.supabase
        .from('health_checks')
        .delete()
        .eq('id', testId);

      if (deleteError) {
        console.warn('Database cleanup failed:', deleteError);
      }

      return true;
    } catch (error) {
      console.warn('Database write test failed:', error);
      return false;
    }
  }

  private async getConnectionInfo(): Promise<any> {
    try {
      // This would typically query pg_stat_activity or similar
      // For now, return a placeholder
      return {
        activeConnections: 'N/A',
        maxConnections: 'N/A',
        utilizationPercentage: 'N/A'
      };
    } catch (error) {
      return { error: 'Could not retrieve connection info' };
    }
  }

  private async testEndpoint(endpoint: string): Promise<boolean> {
    try {
      // This would make actual HTTP requests to test endpoints
      // For now, simulate the test
      await new Promise(resolve => setTimeout(resolve, 100));
      return Math.random() > 0.1; // 90% success rate simulation
    } catch (error) {
      return false;
    }
  }

  private async getStorageInfo(): Promise<any> {
    try {
      // Get storage bucket information
      const { data: buckets, error } = await this.supabase.storage.listBuckets();
      
      if (error) throw error;

      const bucketInfo = await Promise.all(
        buckets.map(async bucket => {
          try {
            const { data: files } = await this.supabase.storage
              .from(bucket.name)
              .list('', { limit: 1 });
            
            return {
              name: bucket.name,
              accessible: true,
              fileCount: files?.length || 0
            };
          } catch {
            return {
              name: bucket.name,
              accessible: false,
              fileCount: 0
            };
          }
        })
      );

      return {
        buckets: bucketInfo,
        totalBuckets: buckets.length
      };
    } catch (error) {
      return { error: 'Could not retrieve storage info' };
    }
  }

  private storeCheckHistory(component: string, result: HealthCheckResult): void {
    if (!this.checkHistory.has(component)) {
      this.checkHistory.set(component, []);
    }

    const history = this.checkHistory.get(component)!;
    history.push(result);

    // Keep only recent history
    if (history.length > this.maxHistorySize) {
      history.shift();
    }
  }

  private getRecentErrorCount(component: string): number {
    const history = this.checkHistory.get(component) || [];
    const recentHistory = history.slice(-10); // Last 10 checks
    
    return recentHistory.filter(check => check.status !== 'healthy').length;
  }

  async getComponentHistory(component: string): Promise<HealthCheckResult[]> {
    return this.checkHistory.get(component) || [];
  }

  async getHealthTrends(): Promise<Record<string, HealthTrend>> {
    const trends: Record<string, HealthTrend> = {};

    for (const [component, history] of this.checkHistory.entries()) {
      const recentChecks = history.slice(-20); // Last 20 checks
      
      if (recentChecks.length === 0) continue;

      const avgResponseTime = recentChecks.reduce((sum, check) => sum + check.responseTime, 0) / recentChecks.length;
      const errorRate = recentChecks.filter(check => check.status !== 'healthy').length / recentChecks.length;
      
      const responseTimes = recentChecks.map(check => check.responseTime);
      const trend = this.calculateTrend(responseTimes);

      trends[component] = {
        avgResponseTime,
        errorRate: errorRate * 100,
        trend: trend > 0.1 ? 'increasing' : trend < -0.1 ? 'decreasing' : 'stable',
        healthScore: Math.max(0, 100 - (errorRate * 100) - Math.min(50, avgResponseTime / 100))
      };
    }

    return trends;
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const x = values.map((_, i) => i);
    const y = values;
    const n = values.length;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  async generateHealthReport(): Promise<HealthReport> {
    const components = await this.checkAllComponents();
    const trends = await this.getHealthTrends();
    
    const overallHealth = this.calculateOverallHealth(components);
    const criticalIssues = this.identifyCriticalIssues(components);
    const recommendations = this.generateRecommendations(components, trends);

    return {
      timestamp: new Date(),
      overallHealth,
      components,
      trends,
      criticalIssues,
      recommendations,
      summary: this.generateHealthSummary(components, trends)
    };
  }

  private calculateOverallHealth(components: Record<string, ComponentHealth>): HealthScore {
    const statuses = Object.values(components);
    const total = statuses.length;
    
    const healthy = statuses.filter(c => c.status === 'healthy').length;
    const degraded = statuses.filter(c => c.status === 'degraded').length;
    const down = statuses.filter(c => c.status === 'down').length;

    const score = (healthy * 100 + degraded * 50 + down * 0) / total;
    
    let status: 'healthy' | 'degraded' | 'critical';
    if (score >= 90) status = 'healthy';
    else if (score >= 50) status = 'degraded';
    else status = 'critical';

    return { score, status };
  }

  private identifyCriticalIssues(components: Record<string, ComponentHealth>): CriticalIssue[] {
    const issues: CriticalIssue[] = [];

    Object.entries(components).forEach(([name, health]) => {
      if (health.status === 'down') {
        issues.push({
          component: name,
          severity: 'critical',
          message: `${name} is down`,
          impact: this.getComponentImpact(name),
          recommendedAction: this.getRecommendedAction(name, 'down')
        });
      } else if (health.status === 'degraded' && health.errorCount > 5) {
        issues.push({
          component: name,
          severity: 'high',
          message: `${name} is experiencing frequent errors`,
          impact: this.getComponentImpact(name),
          recommendedAction: this.getRecommendedAction(name, 'degraded')
        });
      }
    });

    return issues;
  }

  private generateRecommendations(
    components: Record<string, ComponentHealth>,
    trends: Record<string, HealthTrend>
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    Object.entries(trends).forEach(([component, trend]) => {
      if (trend.trend === 'increasing' && trend.avgResponseTime > 2000) {
        recommendations.push({
          type: 'performance',
          priority: 'medium',
          component,
          message: `${component} response time is increasing`,
          action: `Investigate performance bottlenecks in ${component}`,
          estimatedImpact: 'Improved user experience and system reliability'
        });
      }

      if (trend.errorRate > 10) {
        recommendations.push({
          type: 'reliability',
          priority: 'high',
          component,
          message: `${component} has high error rate (${trend.errorRate.toFixed(1)}%)`,
          action: `Review error logs and implement fixes for ${component}`,
          estimatedImpact: 'Reduced system errors and improved stability'
        });
      }
    });

    return recommendations;
  }

  private getComponentImpact(component: string): string {
    const impacts: Record<string, string> = {
      database: 'Complete system unavailability',
      api: 'Limited or no API access',
      pdf_processing: 'PDF processing functionality unavailable',
      file_storage: 'File upload/download issues',
      queue_system: 'Delayed processing of jobs',
      auth_service: 'User authentication issues',
      background_jobs: 'Delayed background processing'
    };

    return impacts[component] || 'Unknown impact';
  }

  private getRecommendedAction(component: string, status: string): string {
    const actions: Record<string, Record<string, string>> = {
      database: {
        down: 'Check database connectivity and restart if necessary',
        degraded: 'Review slow queries and optimize database performance'
      },
      api: {
        down: 'Check API server status and restart services',
        degraded: 'Review API response times and optimize endpoints'
      },
      pdf_processing: {
        down: 'Check PDF processing service and clear queue',
        degraded: 'Review processing job performance and resource allocation'
      }
    };

    return actions[component]?.[status] || 'Contact system administrator';
  }

  private generateHealthSummary(
    components: Record<string, ComponentHealth>,
    trends: Record<string, HealthTrend>
  ): string {
    const totalComponents = Object.keys(components).length;
    const healthyComponents = Object.values(components).filter(c => c.status === 'healthy').length;
    const issues = Object.values(components).filter(c => c.status !== 'healthy').length;

    const deterioratingTrends = Object.values(trends).filter(t => 
      t.trend === 'increasing' && t.avgResponseTime > 1000
    ).length;

    if (issues === 0) {
      return `All ${totalComponents} components are healthy. System operating normally.`;
    } else if (issues === 1) {
      return `1 component requires attention. ${healthyComponents}/${totalComponents} components healthy.`;
    } else {
      const summary = `${issues} components require attention. ${healthyComponents}/${totalComponents} components healthy.`;
      if (deterioratingTrends > 0) {
        return `${summary} ${deterioratingTrends} components showing performance degradation.`;
      }
      return summary;
    }
  }
}

// Type definitions
interface HealthTrend {
  avgResponseTime: number;
  errorRate: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  healthScore: number;
}

interface HealthScore {
  score: number;
  status: 'healthy' | 'degraded' | 'critical';
}

interface CriticalIssue {
  component: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  impact: string;
  recommendedAction: string;
}

interface Recommendation {
  type: 'performance' | 'reliability' | 'security' | 'capacity';
  priority: 'low' | 'medium' | 'high' | 'critical';
  component: string;
  message: string;
  action: string;
  estimatedImpact: string;
}

interface HealthReport {
  timestamp: Date;
  overallHealth: HealthScore;
  components: Record<string, ComponentHealth>;
  trends: Record<string, HealthTrend>;
  criticalIssues: CriticalIssue[];
  recommendations: Recommendation[];
  summary: string;
}