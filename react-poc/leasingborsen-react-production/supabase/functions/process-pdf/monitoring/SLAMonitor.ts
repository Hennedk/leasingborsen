import { SystemMetrics } from './ProductionMonitor';

export interface SLATargets {
  apiResponseTime: number; // milliseconds
  processingTime: number; // seconds
  errorRate: number; // percentage
  uptime: number; // percentage
}

export interface SLAViolation {
  metric: string;
  target: number;
  actual: number;
  duration: number; // milliseconds
  timestamp: Date;
  severity: 'minor' | 'major' | 'critical';
}

export interface SLAReport {
  period: string;
  compliance: {
    uptime: { target: number; actual: number; compliant: boolean };
    responseTime: { target: number; actual: number; compliant: boolean };
    errorRate: { target: number; actual: number; compliant: boolean };
    processingTime: { target: number; actual: number; compliant: boolean };
  };
  violations: SLAViolation[];
  overallCompliance: number;
  recommendations: string[];
}

export interface SLAMetrics {
  timestamp: Date;
  uptime: number;
  responseTime: number;
  errorRate: number;
  processingTime: number;
  availability: boolean;
}

export class SLAMonitor {
  private metricsHistory: SLAMetrics[] = [];
  private violations: SLAViolation[] = [];
  private downtimeStart: Date | null = null;
  private maxHistorySize = 10000; // Keep 10k samples

  constructor(private slaTargets: SLATargets) {}

  checkCompliance(metrics: SystemMetrics): SLAViolation[] {
    const violations: SLAViolation[] = [];
    const timestamp = new Date();

    // Record current metrics
    this.recordMetrics(metrics);

    // Check API response time SLA
    if (metrics.performance.apiResponseTime > this.slaTargets.apiResponseTime) {
      violations.push({
        metric: 'apiResponseTime',
        target: this.slaTargets.apiResponseTime,
        actual: metrics.performance.apiResponseTime,
        duration: 0, // Will be calculated if violation persists
        timestamp,
        severity: this.getSeverity('apiResponseTime', metrics.performance.apiResponseTime)
      });
    }

    // Check processing time SLA
    if (metrics.performance.processingTime > this.slaTargets.processingTime) {
      violations.push({
        metric: 'processingTime',
        target: this.slaTargets.processingTime,
        actual: metrics.performance.processingTime,
        duration: 0,
        timestamp,
        severity: this.getSeverity('processingTime', metrics.performance.processingTime)
      });
    }

    // Check error rate SLA
    if (metrics.errors.rate > this.slaTargets.errorRate) {
      violations.push({
        metric: 'errorRate',
        target: this.slaTargets.errorRate,
        actual: metrics.errors.rate,
        duration: 0,
        timestamp,
        severity: this.getSeverity('errorRate', metrics.errors.rate)
      });
    }

    // Check uptime SLA
    const isSystemUp = metrics.health.overall !== 'critical';
    if (!isSystemUp) {
      if (!this.downtimeStart) {
        this.downtimeStart = timestamp;
      }
      
      const downtimeDuration = timestamp.getTime() - this.downtimeStart.getTime();
      const currentUptime = this.calculateCurrentUptime();
      
      if (currentUptime < this.slaTargets.uptime) {
        violations.push({
          metric: 'uptime',
          target: this.slaTargets.uptime,
          actual: currentUptime,
          duration: downtimeDuration,
          timestamp: this.downtimeStart,
          severity: this.getSeverity('uptime', currentUptime)
        });
      }
    } else {
      this.downtimeStart = null;
    }

    // Store violations
    violations.forEach(violation => {
      this.violations.push(violation);
    });

    // Clean up old violations (keep last 30 days)
    this.cleanupOldViolations();

    return violations;
  }

  async generateReport(periodHours: number = 24): Promise<SLAReport> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - periodHours * 60 * 60 * 1000);
    
    const periodMetrics = this.metricsHistory.filter(
      m => m.timestamp >= startTime && m.timestamp <= endTime
    );

    if (periodMetrics.length === 0) {
      return this.getEmptyReport(periodHours);
    }

    const compliance = this.calculateCompliance(periodMetrics);
    const periodViolations = this.violations.filter(
      v => v.timestamp >= startTime && v.timestamp <= endTime
    );

    const overallCompliance = this.calculateOverallCompliance(compliance);
    const recommendations = this.generateRecommendations(compliance, periodViolations);

    return {
      period: `${periodHours} hours`,
      compliance,
      violations: periodViolations,
      overallCompliance,
      recommendations
    };
  }

  async generateMonthlyReport(): Promise<SLAReport> {
    return this.generateReport(24 * 30); // 30 days
  }

  async getUptimeReport(periodHours: number = 24): Promise<UptimeReport> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - periodHours * 60 * 60 * 1000);
    
    const periodMetrics = this.metricsHistory.filter(
      m => m.timestamp >= startTime && m.timestamp <= endTime
    );

    const totalTime = periodHours * 60 * 60 * 1000; // in milliseconds
    const downtime = this.calculateDowntime(periodMetrics);
    const uptime = totalTime - downtime;
    const uptimePercentage = (uptime / totalTime) * 100;

    const downtimeIncidents = this.getDowntimeIncidents(periodMetrics);
    const mttr = this.calculateMTTR(downtimeIncidents); // Mean Time To Recovery
    const mtbf = this.calculateMTBF(downtimeIncidents, totalTime); // Mean Time Between Failures

    return {
      period: `${periodHours} hours`,
      totalTime,
      uptime,
      downtime,
      uptimePercentage,
      downtimeIncidents,
      mttr,
      mtbf,
      slaTarget: this.slaTargets.uptime,
      slaCompliant: uptimePercentage >= this.slaTargets.uptime
    };
  }

  async getPerformanceReport(periodHours: number = 24): Promise<PerformanceReport> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - periodHours * 60 * 60 * 1000);
    
    const periodMetrics = this.metricsHistory.filter(
      m => m.timestamp >= startTime && m.timestamp <= endTime
    );

    if (periodMetrics.length === 0) {
      return this.getEmptyPerformanceReport(periodHours);
    }

    const responseTimes = periodMetrics.map(m => m.responseTime);
    const processingTimes = periodMetrics.map(m => m.processingTime);
    const errorRates = periodMetrics.map(m => m.errorRate);

    return {
      period: `${periodHours} hours`,
      responseTime: {
        avg: this.average(responseTimes),
        min: Math.min(...responseTimes),
        max: Math.max(...responseTimes),
        p50: this.percentile(responseTimes, 50),
        p95: this.percentile(responseTimes, 95),
        p99: this.percentile(responseTimes, 99),
        slaTarget: this.slaTargets.apiResponseTime,
        slaCompliant: this.average(responseTimes) <= this.slaTargets.apiResponseTime
      },
      processingTime: {
        avg: this.average(processingTimes),
        min: Math.min(...processingTimes),
        max: Math.max(...processingTimes),
        p50: this.percentile(processingTimes, 50),
        p95: this.percentile(processingTimes, 95),
        p99: this.percentile(processingTimes, 99),
        slaTarget: this.slaTargets.processingTime,
        slaCompliant: this.average(processingTimes) <= this.slaTargets.processingTime
      },
      errorRate: {
        avg: this.average(errorRates),
        min: Math.min(...errorRates),
        max: Math.max(...errorRates),
        slaTarget: this.slaTargets.errorRate,
        slaCompliant: this.average(errorRates) <= this.slaTargets.errorRate
      }
    };
  }

  async getViolationTrends(periodDays: number = 7): Promise<ViolationTrends> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - periodDays * 24 * 60 * 60 * 1000);
    
    const periodViolations = this.violations.filter(
      v => v.timestamp >= startTime && v.timestamp <= endTime
    );

    // Group violations by day and metric
    const violationsByDay = new Map<string, SLAViolation[]>();
    const violationsByMetric = new Map<string, SLAViolation[]>();

    periodViolations.forEach(violation => {
      const day = violation.timestamp.toISOString().split('T')[0];
      
      if (!violationsByDay.has(day)) {
        violationsByDay.set(day, []);
      }
      violationsByDay.get(day)!.push(violation);

      if (!violationsByMetric.has(violation.metric)) {
        violationsByMetric.set(violation.metric, []);
      }
      violationsByMetric.get(violation.metric)!.push(violation);
    });

    const dailyTrends = Array.from(violationsByDay.entries()).map(([day, violations]) => ({
      date: new Date(day),
      violationCount: violations.length,
      criticalViolations: violations.filter(v => v.severity === 'critical').length,
      majorViolations: violations.filter(v => v.severity === 'major').length,
      minorViolations: violations.filter(v => v.severity === 'minor').length
    }));

    const metricTrends = Array.from(violationsByMetric.entries()).map(([metric, violations]) => ({
      metric,
      violationCount: violations.length,
      avgSeverity: this.calculateAverageSeverity(violations),
      trend: this.calculateTrend(violations)
    }));

    return {
      period: `${periodDays} days`,
      totalViolations: periodViolations.length,
      dailyTrends,
      metricTrends,
      worstDay: this.findWorstDay(dailyTrends),
      mostProblematicMetric: this.findMostProblematicMetric(metricTrends)
    };
  }

  private recordMetrics(systemMetrics: SystemMetrics): void {
    const slaMetrics: SLAMetrics = {
      timestamp: systemMetrics.timestamp,
      uptime: systemMetrics.health.overall !== 'critical' ? 100 : 0,
      responseTime: systemMetrics.performance.apiResponseTime,
      errorRate: systemMetrics.errors.rate,
      processingTime: systemMetrics.performance.processingTime,
      availability: systemMetrics.health.overall !== 'critical'
    };

    this.metricsHistory.push(slaMetrics);

    // Keep only recent history
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift();
    }
  }

  private getSeverity(metric: string, value: number): 'minor' | 'major' | 'critical' {
    const target = this.slaTargets[metric as keyof SLATargets];
    const ratio = value / target;

    if (metric === 'uptime') {
      // For uptime, lower is worse
      if (value < target * 0.95) return 'critical';
      if (value < target * 0.98) return 'major';
      return 'minor';
    } else {
      // For other metrics, higher is worse
      if (ratio > 2) return 'critical';
      if (ratio > 1.5) return 'major';
      return 'minor';
    }
  }

  private calculateCurrentUptime(): number {
    const last24Hours = this.metricsHistory.slice(-1440); // Assuming 1 minute samples
    if (last24Hours.length === 0) return 100;

    const uptimeCount = last24Hours.filter(m => m.availability).length;
    return (uptimeCount / last24Hours.length) * 100;
  }

  private calculateCompliance(metrics: SLAMetrics[]): SLAReport['compliance'] {
    const responseTimes = metrics.map(m => m.responseTime);
    const processingTimes = metrics.map(m => m.processingTime);
    const errorRates = metrics.map(m => m.errorRate);
    const uptimes = metrics.map(m => m.uptime);

    const avgResponseTime = this.average(responseTimes);
    const avgProcessingTime = this.average(processingTimes);
    const avgErrorRate = this.average(errorRates);
    const avgUptime = this.average(uptimes);

    return {
      uptime: {
        target: this.slaTargets.uptime,
        actual: avgUptime,
        compliant: avgUptime >= this.slaTargets.uptime
      },
      responseTime: {
        target: this.slaTargets.apiResponseTime,
        actual: avgResponseTime,
        compliant: avgResponseTime <= this.slaTargets.apiResponseTime
      },
      errorRate: {
        target: this.slaTargets.errorRate,
        actual: avgErrorRate,
        compliant: avgErrorRate <= this.slaTargets.errorRate
      },
      processingTime: {
        target: this.slaTargets.processingTime,
        actual: avgProcessingTime,
        compliant: avgProcessingTime <= this.slaTargets.processingTime
      }
    };
  }

  private calculateOverallCompliance(compliance: SLAReport['compliance']): number {
    const metrics = Object.values(compliance);
    const compliantCount = metrics.filter(m => m.compliant).length;
    return (compliantCount / metrics.length) * 100;
  }

  private generateRecommendations(
    compliance: SLAReport['compliance'],
    violations: SLAViolation[]
  ): string[] {
    const recommendations: string[] = [];

    if (!compliance.uptime.compliant) {
      recommendations.push(
        `Uptime is ${compliance.uptime.actual.toFixed(2)}%, below target of ${compliance.uptime.target}%. ` +
        'Consider implementing redundancy and failover mechanisms.'
      );
    }

    if (!compliance.responseTime.compliant) {
      recommendations.push(
        `API response time is ${compliance.responseTime.actual.toFixed(0)}ms, exceeding target of ${compliance.responseTime.target}ms. ` +
        'Optimize database queries and consider caching strategies.'
      );
    }

    if (!compliance.errorRate.compliant) {
      recommendations.push(
        `Error rate is ${compliance.errorRate.actual.toFixed(2)}%, above target of ${compliance.errorRate.target}%. ` +
        'Review error logs and implement better error handling.'
      );
    }

    if (!compliance.processingTime.compliant) {
      recommendations.push(
        `Processing time is ${compliance.processingTime.actual.toFixed(1)}s, exceeding target of ${compliance.processingTime.target}s. ` +
        'Optimize processing algorithms and consider parallel processing.'
      );
    }

    // Analyze violation patterns
    const criticalViolations = violations.filter(v => v.severity === 'critical');
    if (criticalViolations.length > 0) {
      recommendations.push(
        `${criticalViolations.length} critical SLA violations detected. Immediate attention required.`
      );
    }

    const frequentViolations = this.getFrequentViolations(violations);
    if (frequentViolations.length > 0) {
      recommendations.push(
        `Frequent violations detected for: ${frequentViolations.join(', ')}. ` +
        'Consider adjusting SLA targets or improving system performance.'
      );
    }

    return recommendations;
  }

  private calculateDowntime(metrics: SLAMetrics[]): number {
    let totalDowntime = 0;
    let downtimeStart: Date | null = null;

    metrics.forEach(metric => {
      if (!metric.availability) {
        if (!downtimeStart) {
          downtimeStart = metric.timestamp;
        }
      } else {
        if (downtimeStart) {
          totalDowntime += metric.timestamp.getTime() - downtimeStart.getTime();
          downtimeStart = null;
        }
      }
    });

    // If still down at the end of the period
    if (downtimeStart && metrics.length > 0) {
      totalDowntime += metrics[metrics.length - 1].timestamp.getTime() - downtimeStart.getTime();
    }

    return totalDowntime;
  }

  private getDowntimeIncidents(metrics: SLAMetrics[]): DowntimeIncident[] {
    const incidents: DowntimeIncident[] = [];
    let incidentStart: Date | null = null;

    metrics.forEach(metric => {
      if (!metric.availability) {
        if (!incidentStart) {
          incidentStart = metric.timestamp;
        }
      } else {
        if (incidentStart) {
          incidents.push({
            start: incidentStart,
            end: metric.timestamp,
            duration: metric.timestamp.getTime() - incidentStart.getTime()
          });
          incidentStart = null;
        }
      }
    });

    return incidents;
  }

  private calculateMTTR(incidents: DowntimeIncident[]): number {
    if (incidents.length === 0) return 0;
    
    const totalRecoveryTime = incidents.reduce((sum, incident) => sum + incident.duration, 0);
    return totalRecoveryTime / incidents.length / 1000 / 60; // Convert to minutes
  }

  private calculateMTBF(incidents: DowntimeIncident[], totalTime: number): number {
    if (incidents.length <= 1) return totalTime / 1000 / 60; // Convert to minutes
    
    const totalUptime = totalTime - incidents.reduce((sum, incident) => sum + incident.duration, 0);
    return totalUptime / (incidents.length - 1) / 1000 / 60; // Convert to minutes
  }

  private getFrequentViolations(violations: SLAViolation[]): string[] {
    const violationCounts = violations.reduce((acc, violation) => {
      acc[violation.metric] = (acc[violation.metric] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const threshold = Math.max(3, violations.length * 0.1); // At least 3 or 10% of total
    
    return Object.entries(violationCounts)
      .filter(([_, count]) => count >= threshold)
      .map(([metric, _]) => metric);
  }

  private calculateAverageSeverity(violations: SLAViolation[]): number {
    const severityScores = { minor: 1, major: 2, critical: 3 };
    const totalScore = violations.reduce((sum, violation) => sum + severityScores[violation.severity], 0);
    return totalScore / violations.length;
  }

  private calculateTrend(violations: SLAViolation[]): 'improving' | 'worsening' | 'stable' {
    if (violations.length < 4) return 'stable';

    const sorted = violations.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
    const secondHalf = sorted.slice(Math.floor(sorted.length / 2));

    const firstHalfAvg = this.calculateAverageSeverity(firstHalf);
    const secondHalfAvg = this.calculateAverageSeverity(secondHalf);

    if (secondHalfAvg > firstHalfAvg * 1.2) return 'worsening';
    if (secondHalfAvg < firstHalfAvg * 0.8) return 'improving';
    return 'stable';
  }

  private findWorstDay(dailyTrends: any[]): any {
    return dailyTrends.reduce((worst, current) => 
      current.violationCount > worst.violationCount ? current : worst
    );
  }

  private findMostProblematicMetric(metricTrends: any[]): any {
    return metricTrends.reduce((worst, current) => 
      current.violationCount > worst.violationCount ? current : worst
    );
  }

  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  private percentile(numbers: number[], percentile: number): number {
    if (numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  private cleanupOldViolations(): void {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    this.violations = this.violations.filter(violation => violation.timestamp >= thirtyDaysAgo);
  }

  private getEmptyReport(periodHours: number): SLAReport {
    return {
      period: `${periodHours} hours`,
      compliance: {
        uptime: { target: this.slaTargets.uptime, actual: 0, compliant: false },
        responseTime: { target: this.slaTargets.apiResponseTime, actual: 0, compliant: true },
        errorRate: { target: this.slaTargets.errorRate, actual: 0, compliant: true },
        processingTime: { target: this.slaTargets.processingTime, actual: 0, compliant: true }
      },
      violations: [],
      overallCompliance: 0,
      recommendations: ['No data available for the specified period']
    };
  }

  private getEmptyPerformanceReport(periodHours: number): PerformanceReport {
    return {
      period: `${periodHours} hours`,
      responseTime: {
        avg: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0,
        slaTarget: this.slaTargets.apiResponseTime, slaCompliant: true
      },
      processingTime: {
        avg: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0,
        slaTarget: this.slaTargets.processingTime, slaCompliant: true
      },
      errorRate: {
        avg: 0, min: 0, max: 0,
        slaTarget: this.slaTargets.errorRate, slaCompliant: true
      }
    };
  }
}

// Type definitions
interface UptimeReport {
  period: string;
  totalTime: number;
  uptime: number;
  downtime: number;
  uptimePercentage: number;
  downtimeIncidents: DowntimeIncident[];
  mttr: number; // Mean Time To Recovery (minutes)
  mtbf: number; // Mean Time Between Failures (minutes)
  slaTarget: number;
  slaCompliant: boolean;
}

interface DowntimeIncident {
  start: Date;
  end: Date;
  duration: number; // milliseconds
}

interface PerformanceReport {
  period: string;
  responseTime: PerformanceMetric;
  processingTime: PerformanceMetric;
  errorRate: {
    avg: number;
    min: number;
    max: number;
    slaTarget: number;
    slaCompliant: boolean;
  };
}

interface PerformanceMetric {
  avg: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
  slaTarget: number;
  slaCompliant: boolean;
}

interface ViolationTrends {
  period: string;
  totalViolations: number;
  dailyTrends: DailyTrend[];
  metricTrends: MetricTrend[];
  worstDay: DailyTrend;
  mostProblematicMetric: MetricTrend;
}

interface DailyTrend {
  date: Date;
  violationCount: number;
  criticalViolations: number;
  majorViolations: number;
  minorViolations: number;
}

interface MetricTrend {
  metric: string;
  violationCount: number;
  avgSeverity: number;
  trend: 'improving' | 'worsening' | 'stable';
}