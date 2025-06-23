import { MonitoringConfig } from './ProductionMonitor';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  component: string;
  message: string;
  details: any;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;
  escalationLevel: number;
  notificationsSent: string[];
}

export type AlertType = 
  | 'health_check_failure'
  | 'sla_violation'
  | 'resource_threshold'
  | 'error_rate_spike'
  | 'performance_degradation'
  | 'system_unavailable'
  | 'capacity_warning'
  | 'security_incident';

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface NotificationChannel {
  type: 'email' | 'sms' | 'webhook' | 'slack' | 'teams' | 'discord';
  enabled: boolean;
  config: any;
  severityFilter: AlertSeverity[];
}

export interface EscalationRule {
  severity: AlertSeverity;
  timeToEscalate: number; // minutes
  maxEscalationLevel: number;
  escalationChannels: string[];
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: AlertCondition;
  severity: AlertSeverity;
  enabled: boolean;
  cooldownPeriod: number; // minutes
  notificationChannels: string[];
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'contains';
  threshold: number | string;
  duration: number; // minutes
  aggregation?: 'avg' | 'max' | 'min' | 'sum' | 'count';
}

export class AlertManager {
  private alerts: Map<string, Alert> = new Map();
  private notificationChannels: Map<string, NotificationChannel> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private escalationRules: EscalationRule[] = [];
  private alertHistory: Alert[] = [];
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(private config: MonitoringConfig) {
    this.initializeDefaultRules();
    this.initializeDefaultChannels();
    this.initializeEscalationRules();
  }

  async initialize(): Promise<void> {
    console.log('Initializing Alert Manager...');
    
    // Load persistent alerts from database
    await this.loadActiveAlerts();
    
    // Start escalation monitoring
    this.startEscalationMonitoring();
    
    console.log('Alert Manager initialized successfully');
  }

  async sendAlert(
    type: AlertType,
    severity: AlertSeverity,
    component: string,
    message: string,
    details?: any
  ): Promise<Alert> {
    const alertId = this.generateAlertId();
    
    const alert: Alert = {
      id: alertId,
      type,
      severity,
      component,
      message,
      details: details || {},
      timestamp: new Date(),
      acknowledged: false,
      resolved: false,
      escalationLevel: 0,
      notificationsSent: []
    };

    // Check cooldown period
    if (this.isInCooldown(type, component)) {
      console.log(`Alert ${type} for ${component} is in cooldown period`);
      return alert;
    }

    // Store alert
    this.alerts.set(alertId, alert);
    this.alertHistory.push(alert);

    // Send notifications
    await this.sendNotifications(alert);

    // Schedule escalation if needed
    this.scheduleEscalation(alert);

    // Persist to database
    await this.persistAlert(alert);

    console.log(`Alert sent: ${severity} - ${message}`);
    return alert;
  }

  async sendCriticalAlert(details: {
    type: AlertType;
    message: string;
    error?: string;
    timestamp: Date;
    component?: string;
  }): Promise<Alert> {
    return this.sendAlert(
      details.type,
      'critical',
      details.component || 'system',
      details.message,
      { error: details.error, timestamp: details.timestamp }
    );
  }

  async sendSLAAlert(violations: any[]): Promise<Alert> {
    const message = `SLA violations detected: ${violations.map(v => v.metric).join(', ')}`;
    
    return this.sendAlert(
      'sla_violation',
      'error',
      'sla_monitor',
      message,
      { violations }
    );
  }

  async sendResourceAlert(violations: any[]): Promise<Alert> {
    const criticalViolations = violations.filter(v => v.severity === 'critical');
    const severity = criticalViolations.length > 0 ? 'critical' : 'warning';
    
    const message = `Resource threshold violations: ${violations.map(v => v.resource).join(', ')}`;
    
    return this.sendAlert(
      'resource_threshold',
      severity,
      'resource_monitor',
      message,
      { violations }
    );
  }

  async sendPerformanceAlert(metric: string, value: number, threshold: number): Promise<Alert> {
    const message = `Performance degradation detected: ${metric} = ${value}, threshold = ${threshold}`;
    
    return this.sendAlert(
      'performance_degradation',
      'warning',
      'performance_monitor',
      message,
      { metric, value, threshold }
    );
  }

  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();

    // Cancel escalation
    this.cancelEscalation(alertId);

    // Update in database
    await this.updateAlert(alert);

    console.log(`Alert ${alertId} acknowledged by ${acknowledgedBy}`);
    return true;
  }

  async resolveAlert(alertId: string, resolvedBy?: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.resolved = true;
    alert.resolvedAt = new Date();

    // Cancel escalation
    this.cancelEscalation(alertId);

    // Remove from active alerts
    this.alerts.delete(alertId);

    // Update in database
    await this.updateAlert(alert);

    console.log(`Alert ${alertId} resolved`);
    return true;
  }

  async getActiveAlerts(severity?: AlertSeverity): Promise<Alert[]> {
    let alerts = Array.from(this.alerts.values());
    
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }
    
    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getAlertHistory(
    hours: number = 24,
    severity?: AlertSeverity
  ): Promise<Alert[]> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    let alerts = this.alertHistory.filter(alert => alert.timestamp >= cutoff);
    
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }
    
    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getAlertStatistics(hours: number = 24): Promise<AlertStatistics> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const recentAlerts = this.alertHistory.filter(alert => alert.timestamp >= cutoff);

    const totalAlerts = recentAlerts.length;
    const alertsBySeverity = recentAlerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<AlertSeverity, number>);

    const alertsByType = recentAlerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {} as Record<AlertType, number>);

    const alertsByComponent = recentAlerts.reduce((acc, alert) => {
      acc[alert.component] = (acc[alert.component] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const resolvedAlerts = recentAlerts.filter(alert => alert.resolved).length;
    const acknowledgedAlerts = recentAlerts.filter(alert => alert.acknowledged).length;

    const avgResolutionTime = this.calculateAverageResolutionTime(recentAlerts);
    const avgAcknowledgmentTime = this.calculateAverageAcknowledgmentTime(recentAlerts);

    return {
      period: `${hours} hours`,
      totalAlerts,
      alertsBySeverity,
      alertsByType,
      alertsByComponent,
      resolvedAlerts,
      acknowledgedAlerts,
      resolutionRate: totalAlerts > 0 ? (resolvedAlerts / totalAlerts) * 100 : 0,
      acknowledgmentRate: totalAlerts > 0 ? (acknowledgedAlerts / totalAlerts) * 100 : 0,
      avgResolutionTime,
      avgAcknowledgmentTime
    };
  }

  async addNotificationChannel(
    id: string,
    type: NotificationChannel['type'],
    config: any,
    severityFilter: AlertSeverity[] = ['info', 'warning', 'error', 'critical']
  ): Promise<void> {
    const channel: NotificationChannel = {
      type,
      enabled: true,
      config,
      severityFilter
    };

    this.notificationChannels.set(id, channel);
    await this.saveNotificationChannel(id, channel);
  }

  async updateNotificationChannel(
    id: string,
    updates: Partial<NotificationChannel>
  ): Promise<boolean> {
    const channel = this.notificationChannels.get(id);
    if (!channel) return false;

    Object.assign(channel, updates);
    this.notificationChannels.set(id, channel);
    await this.saveNotificationChannel(id, channel);
    
    return true;
  }

  async addAlertRule(rule: AlertRule): Promise<void> {
    this.alertRules.set(rule.id, rule);
    await this.saveAlertRule(rule);
  }

  async updateAlertRule(id: string, updates: Partial<AlertRule>): Promise<boolean> {
    const rule = this.alertRules.get(id);
    if (!rule) return false;

    Object.assign(rule, updates);
    this.alertRules.set(id, rule);
    await this.saveAlertRule(rule);
    
    return true;
  }

  async evaluateRules(metrics: any): Promise<void> {
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue;

      const conditionMet = this.evaluateCondition(rule.condition, metrics);
      
      if (conditionMet) {
        await this.sendAlert(
          'system_unavailable', // Generic type, should be mapped from rule
          rule.severity,
          'rule_engine',
          `Alert rule triggered: ${rule.name}`,
          { rule: rule.id, condition: rule.condition }
        );
      }
    }
  }

  private async sendNotifications(alert: Alert): Promise<void> {
    const applicableChannels = Array.from(this.notificationChannels.entries())
      .filter(([_, channel]) => 
        channel.enabled && 
        channel.severityFilter.includes(alert.severity)
      );

    for (const [channelId, channel] of applicableChannels) {
      try {
        await this.sendNotification(channelId, channel, alert);
        alert.notificationsSent.push(channelId);
      } catch (error) {
        console.error(`Failed to send notification via ${channelId}:`, error);
      }
    }
  }

  private async sendNotification(
    channelId: string,
    channel: NotificationChannel,
    alert: Alert
  ): Promise<void> {
    const message = this.formatAlertMessage(alert, channel.type);

    switch (channel.type) {
      case 'email':
        await this.sendEmailNotification(channel.config, message, alert);
        break;
      case 'sms':
        await this.sendSMSNotification(channel.config, message, alert);
        break;
      case 'webhook':
        await this.sendWebhookNotification(channel.config, alert);
        break;
      case 'slack':
        await this.sendSlackNotification(channel.config, message, alert);
        break;
      case 'teams':
        await this.sendTeamsNotification(channel.config, message, alert);
        break;
      case 'discord':
        await this.sendDiscordNotification(channel.config, message, alert);
        break;
    }
  }

  private formatAlertMessage(alert: Alert, channelType: string): string {
    const emoji = this.getSeverityEmoji(alert.severity);
    const timestamp = alert.timestamp.toLocaleString();

    let message = `${emoji} ALERT - ${alert.severity.toUpperCase()}\n`;
    message += `Component: ${alert.component}\n`;
    message += `Message: ${alert.message}\n`;
    message += `Time: ${timestamp}\n`;
    message += `Alert ID: ${alert.id}`;

    if (channelType === 'slack' || channelType === 'discord') {
      // Add formatting for rich text channels
      message = this.addRichTextFormatting(message, channelType);
    }

    return message;
  }

  private getSeverityEmoji(severity: AlertSeverity): string {
    const emojis = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      critical: '🚨'
    };
    return emojis[severity] || '📢';
  }

  private addRichTextFormatting(message: string, channelType: string): string {
    if (channelType === 'slack') {
      return message
        .replace(/ALERT - (\w+)/, '*ALERT - $1*')
        .replace(/Component: (.+)/, '*Component:* $1')
        .replace(/Message: (.+)/, '*Message:* $1')
        .replace(/Time: (.+)/, '*Time:* $1')
        .replace(/Alert ID: (.+)/, '*Alert ID:* `$1`');
    }
    return message;
  }

  private async sendEmailNotification(
    config: any,
    message: string,
    alert: Alert
  ): Promise<void> {
    // Implementation would use actual email service
    console.log(`Email notification sent: ${message}`);
  }

  private async sendSMSNotification(
    config: any,
    message: string,
    alert: Alert
  ): Promise<void> {
    // Implementation would use SMS service
    console.log(`SMS notification sent: ${message}`);
  }

  private async sendWebhookNotification(
    config: any,
    alert: Alert
  ): Promise<void> {
    try {
      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers
        },
        body: JSON.stringify({
          alert,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}`);
      }
    } catch (error) {
      console.error('Webhook notification failed:', error);
      throw error;
    }
  }

  private async sendSlackNotification(
    config: any,
    message: string,
    alert: Alert
  ): Promise<void> {
    const payload = {
      channel: config.channel,
      text: message,
      username: 'Monitoring Bot',
      icon_emoji: ':warning:',
      attachments: [{
        color: this.getSeverityColor(alert.severity),
        fields: [
          { title: 'Component', value: alert.component, short: true },
          { title: 'Severity', value: alert.severity, short: true },
          { title: 'Type', value: alert.type, short: true },
          { title: 'Time', value: alert.timestamp.toLocaleString(), short: true }
        ]
      }]
    };

    await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  private async sendTeamsNotification(
    config: any,
    message: string,
    alert: Alert
  ): Promise<void> {
    const payload = {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor: this.getSeverityColor(alert.severity),
      summary: `Alert: ${alert.message}`,
      sections: [{
        activityTitle: `${alert.severity.toUpperCase()} Alert`,
        activitySubtitle: alert.component,
        facts: [
          { name: 'Message', value: alert.message },
          { name: 'Type', value: alert.type },
          { name: 'Time', value: alert.timestamp.toLocaleString() }
        ]
      }]
    };

    await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  private async sendDiscordNotification(
    config: any,
    message: string,
    alert: Alert
  ): Promise<void> {
    const payload = {
      content: message,
      embeds: [{
        title: `${alert.severity.toUpperCase()} Alert`,
        description: alert.message,
        color: parseInt(this.getSeverityColor(alert.severity).replace('#', ''), 16),
        fields: [
          { name: 'Component', value: alert.component, inline: true },
          { name: 'Type', value: alert.type, inline: true },
          { name: 'Time', value: alert.timestamp.toLocaleString(), inline: false }
        ],
        timestamp: alert.timestamp.toISOString()
      }]
    };

    await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  private getSeverityColor(severity: AlertSeverity): string {
    const colors = {
      info: '#36a3f7',
      warning: '#ffab00',
      error: '#f44336',
      critical: '#d32f2f'
    };
    return colors[severity] || '#757575';
  }

  private scheduleEscalation(alert: Alert): void {
    const escalationRule = this.escalationRules.find(rule => rule.severity === alert.severity);
    if (!escalationRule) return;

    const escalationTimer = setTimeout(async () => {
      await this.escalateAlert(alert.id);
    }, escalationRule.timeToEscalate * 60 * 1000);

    this.escalationTimers.set(alert.id, escalationTimer);
  }

  private cancelEscalation(alertId: string): void {
    const timer = this.escalationTimers.get(alertId);
    if (timer) {
      clearTimeout(timer);
      this.escalationTimers.delete(alertId);
    }
  }

  private async escalateAlert(alertId: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.acknowledged || alert.resolved) return;

    const escalationRule = this.escalationRules.find(rule => rule.severity === alert.severity);
    if (!escalationRule) return;

    alert.escalationLevel++;

    if (alert.escalationLevel >= escalationRule.maxEscalationLevel) {
      console.log(`Alert ${alertId} reached maximum escalation level`);
      return;
    }

    // Send escalation notifications
    await this.sendEscalationNotifications(alert, escalationRule);

    // Schedule next escalation
    this.scheduleEscalation(alert);

    console.log(`Alert ${alertId} escalated to level ${alert.escalationLevel}`);
  }

  private async sendEscalationNotifications(
    alert: Alert,
    escalationRule: EscalationRule
  ): Promise<void> {
    for (const channelId of escalationRule.escalationChannels) {
      const channel = this.notificationChannels.get(channelId);
      if (channel && channel.enabled) {
        const escalationMessage = `ESCALATION LEVEL ${alert.escalationLevel}: ${alert.message}`;
        const escalatedAlert = { ...alert, message: escalationMessage };
        
        try {
          await this.sendNotification(channelId, channel, escalatedAlert);
        } catch (error) {
          console.error(`Failed to send escalation notification via ${channelId}:`, error);
        }
      }
    }
  }

  private startEscalationMonitoring(): void {
    // Check for unacknowledged alerts every minute
    setInterval(() => {
      for (const alert of this.alerts.values()) {
        if (!alert.acknowledged && !alert.resolved) {
          const alertAge = Date.now() - alert.timestamp.getTime();
          const escalationRule = this.escalationRules.find(rule => rule.severity === alert.severity);
          
          if (escalationRule && alertAge > escalationRule.timeToEscalate * 60 * 1000) {
            this.escalateAlert(alert.id);
          }
        }
      }
    }, 60000); // Every minute
  }

  private isInCooldown(type: AlertType, component: string): boolean {
    const recentAlerts = this.alertHistory.filter(alert => 
      alert.type === type && 
      alert.component === component &&
      Date.now() - alert.timestamp.getTime() < 30 * 60 * 1000 // 30 minutes
    );

    return recentAlerts.length > 0;
  }

  private evaluateCondition(condition: AlertCondition, metrics: any): boolean {
    const value = this.getMetricValue(condition.metric, metrics);
    if (value === undefined) return false;

    switch (condition.operator) {
      case 'gt': return value > condition.threshold;
      case 'gte': return value >= condition.threshold;
      case 'lt': return value < condition.threshold;
      case 'lte': return value <= condition.threshold;
      case 'eq': return value === condition.threshold;
      case 'contains': return String(value).includes(String(condition.threshold));
      default: return false;
    }
  }

  private getMetricValue(metricPath: string, metrics: any): any {
    const keys = metricPath.split('.');
    let value = metrics;
    
    for (const key of keys) {
      if (value && typeof value === 'object') {
        value = value[key];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  private calculateAverageResolutionTime(alerts: Alert[]): number {
    const resolvedAlerts = alerts.filter(alert => alert.resolved && alert.resolvedAt);
    if (resolvedAlerts.length === 0) return 0;

    const totalTime = resolvedAlerts.reduce((sum, alert) => {
      const resolutionTime = alert.resolvedAt!.getTime() - alert.timestamp.getTime();
      return sum + resolutionTime;
    }, 0);

    return totalTime / resolvedAlerts.length / 1000 / 60; // Convert to minutes
  }

  private calculateAverageAcknowledgmentTime(alerts: Alert[]): number {
    const acknowledgedAlerts = alerts.filter(alert => alert.acknowledged && alert.acknowledgedAt);
    if (acknowledgedAlerts.length === 0) return 0;

    const totalTime = acknowledgedAlerts.reduce((sum, alert) => {
      const ackTime = alert.acknowledgedAt!.getTime() - alert.timestamp.getTime();
      return sum + ackTime;
    }, 0);

    return totalTime / acknowledgedAlerts.length / 1000 / 60; // Convert to minutes
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeDefaultRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        description: 'Alert when error rate exceeds 5%',
        condition: {
          metric: 'errors.rate',
          operator: 'gt',
          threshold: 5,
          duration: 5
        },
        severity: 'error',
        enabled: true,
        cooldownPeriod: 15,
        notificationChannels: ['default']
      },
      {
        id: 'high_response_time',
        name: 'High Response Time',
        description: 'Alert when response time exceeds 5 seconds',
        condition: {
          metric: 'performance.apiResponseTime',
          operator: 'gt',
          threshold: 5000,
          duration: 3
        },
        severity: 'warning',
        enabled: true,
        cooldownPeriod: 10,
        notificationChannels: ['default']
      },
      {
        id: 'high_cpu_usage',
        name: 'High CPU Usage',
        description: 'Alert when CPU usage exceeds 90%',
        condition: {
          metric: 'resources.cpuUsage',
          operator: 'gt',
          threshold: 90,
          duration: 5
        },
        severity: 'critical',
        enabled: true,
        cooldownPeriod: 10,
        notificationChannels: ['default']
      }
    ];

    defaultRules.forEach(rule => this.alertRules.set(rule.id, rule));
  }

  private initializeDefaultChannels(): void {
    // Default console channel for development
    this.notificationChannels.set('console', {
      type: 'webhook',
      enabled: true,
      config: { console: true },
      severityFilter: ['info', 'warning', 'error', 'critical']
    });
  }

  private initializeEscalationRules(): void {
    this.escalationRules = [
      {
        severity: 'critical',
        timeToEscalate: 5, // 5 minutes
        maxEscalationLevel: 3,
        escalationChannels: ['primary', 'secondary']
      },
      {
        severity: 'error',
        timeToEscalate: 15, // 15 minutes
        maxEscalationLevel: 2,
        escalationChannels: ['primary']
      },
      {
        severity: 'warning',
        timeToEscalate: 60, // 1 hour
        maxEscalationLevel: 1,
        escalationChannels: ['primary']
      }
    ];
  }

  // Database persistence methods (to be implemented based on your database)
  private async loadActiveAlerts(): Promise<void> {
    // Load alerts from database
    console.log('Loading active alerts from database...');
  }

  private async persistAlert(alert: Alert): Promise<void> {
    // Save alert to database
    console.log(`Persisting alert ${alert.id} to database`);
  }

  private async updateAlert(alert: Alert): Promise<void> {
    // Update alert in database
    console.log(`Updating alert ${alert.id} in database`);
  }

  private async saveNotificationChannel(id: string, channel: NotificationChannel): Promise<void> {
    // Save notification channel to database
    console.log(`Saving notification channel ${id} to database`);
  }

  private async saveAlertRule(rule: AlertRule): Promise<void> {
    // Save alert rule to database
    console.log(`Saving alert rule ${rule.id} to database`);
  }
}

// Type definitions
interface AlertStatistics {
  period: string;
  totalAlerts: number;
  alertsBySeverity: Record<AlertSeverity, number>;
  alertsByType: Record<AlertType, number>;
  alertsByComponent: Record<string, number>;
  resolvedAlerts: number;
  acknowledgedAlerts: number;
  resolutionRate: number;
  acknowledgmentRate: number;
  avgResolutionTime: number; // minutes
  avgAcknowledgmentTime: number; // minutes
}