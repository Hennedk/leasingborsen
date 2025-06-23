# Production Monitoring Setup Guide

## Overview

This guide provides step-by-step instructions for setting up comprehensive production monitoring for the PDF processing pipeline. The monitoring system includes real-time health checks, performance metrics, alerting, and operational dashboards.

## Prerequisites

- Supabase project with appropriate permissions
- Node.js 18+ and npm installed
- Access to production environment
- Email/SMS services for alerting (optional)
- Slack/Teams/Discord webhooks for notifications (optional)

## Database Schema Setup

### 1. Create Monitoring Tables

```sql
-- System metrics storage
CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  tags JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for time-series queries
CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp_name 
ON system_metrics(timestamp DESC, metric_name);

-- Health check results
CREATE TABLE IF NOT EXISTS health_checks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  component TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
  response_time INTEGER NOT NULL,
  error_message TEXT,
  details JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_checks_component_timestamp 
ON health_checks(component, timestamp DESC);

-- Alert storage
CREATE TABLE IF NOT EXISTS alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  component TEXT NOT NULL,
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by TEXT,
  acknowledged_at TIMESTAMPTZ,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  escalation_level INTEGER DEFAULT 0,
  notifications_sent TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_status_created 
ON alerts(acknowledged, resolved, created_at DESC);

-- SLA violations tracking
CREATE TABLE IF NOT EXISTS sla_violations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  metric TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  actual_value NUMERIC NOT NULL,
  violation_duration INTEGER, -- milliseconds
  severity TEXT NOT NULL CHECK (severity IN ('minor', 'major', 'critical')),
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Error logs aggregation
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  component TEXT,
  user_id UUID,
  session_id TEXT,
  request_id TEXT,
  severity TEXT DEFAULT 'error',
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_error_logs_type_timestamp 
ON error_logs(error_type, timestamp DESC);

-- Metrics samples for detailed analysis
CREATE TABLE IF NOT EXISTS metrics_samples (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  tags JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partition by month for performance
CREATE INDEX IF NOT EXISTS idx_metrics_samples_timestamp 
ON metrics_samples(timestamp DESC);
```

### 2. Row Level Security (RLS)

```sql
-- Enable RLS on monitoring tables
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics_samples ENABLE ROW LEVEL SECURITY;

-- Create policies for service role access
CREATE POLICY monitoring_service_access ON system_metrics
  FOR ALL USING (true);

CREATE POLICY health_checks_service_access ON health_checks
  FOR ALL USING (true);

CREATE POLICY alerts_service_access ON alerts
  FOR ALL USING (true);

CREATE POLICY sla_violations_service_access ON sla_violations
  FOR ALL USING (true);

CREATE POLICY error_logs_service_access ON error_logs
  FOR ALL USING (true);

CREATE POLICY metrics_samples_service_access ON metrics_samples
  FOR ALL USING (true);

-- Create policies for authenticated users (read-only)
CREATE POLICY monitoring_read_access ON system_metrics
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY health_checks_read_access ON health_checks
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY alerts_read_access ON alerts
  FOR SELECT USING (auth.role() = 'authenticated');
```

### 3. Database Functions

```sql
-- Function to clean up old metrics
CREATE OR REPLACE FUNCTION cleanup_old_metrics()
RETURNS void AS $$
BEGIN
  -- Keep only 30 days of detailed metrics
  DELETE FROM metrics_samples 
  WHERE timestamp < NOW() - INTERVAL '30 days';
  
  -- Keep only 90 days of system metrics
  DELETE FROM system_metrics 
  WHERE timestamp < NOW() - INTERVAL '90 days';
  
  -- Keep only 90 days of health checks
  DELETE FROM health_checks 
  WHERE timestamp < NOW() - INTERVAL '90 days';
  
  -- Keep resolved alerts for 30 days
  DELETE FROM alerts 
  WHERE resolved = true 
  AND resolved_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Function to get system health summary
CREATE OR REPLACE FUNCTION get_system_health_summary()
RETURNS TABLE(
  component TEXT,
  status TEXT,
  avg_response_time NUMERIC,
  error_count BIGINT,
  last_check TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    hc.component,
    hc.status,
    AVG(hc.response_time) as avg_response_time,
    COUNT(*) FILTER (WHERE hc.status != 'healthy') as error_count,
    MAX(hc.timestamp) as last_check
  FROM health_checks hc
  WHERE hc.timestamp > NOW() - INTERVAL '1 hour'
  GROUP BY hc.component, hc.status
  ORDER BY hc.component;
END;
$$ LANGUAGE plpgsql;
```

## Environment Configuration

### 1. Environment Variables

Create a `.env.production` file:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_production_supabase_url
VITE_SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Monitoring Configuration
MONITORING_ENABLED=true
MONITORING_INTERVAL=30000
METRICS_RETENTION_DAYS=30
ALERTS_ENABLED=true

# SLA Targets
SLA_API_RESPONSE_TIME=2000
SLA_PROCESSING_TIME=30
SLA_ERROR_RATE=1
SLA_UPTIME=99.9

# Resource Thresholds
THRESHOLD_CPU_USAGE=80
THRESHOLD_MEMORY_USAGE=85
THRESHOLD_DATABASE_CONNECTIONS=50
THRESHOLD_QUEUE_DEPTH=100

# Notification Settings
NOTIFICATION_EMAIL=alerts@yourcompany.com
NOTIFICATION_SLACK_WEBHOOK=your_slack_webhook_url
NOTIFICATION_TEAMS_WEBHOOK=your_teams_webhook_url
```

### 2. Monitoring Configuration

Create `monitoring.config.js`:

```javascript
export const monitoringConfig = {
  enableRealTimeMonitoring: process.env.MONITORING_ENABLED === 'true',
  metricsRetentionDays: parseInt(process.env.METRICS_RETENTION_DAYS) || 30,
  alertingEnabled: process.env.ALERTS_ENABLED === 'true',
  
  slaTargets: {
    apiResponseTime: parseInt(process.env.SLA_API_RESPONSE_TIME) || 2000,
    processingTime: parseInt(process.env.SLA_PROCESSING_TIME) || 30,
    errorRate: parseFloat(process.env.SLA_ERROR_RATE) || 1,
    uptime: parseFloat(process.env.SLA_UPTIME) || 99.9
  },
  
  resourceThresholds: {
    cpuUsage: parseInt(process.env.THRESHOLD_CPU_USAGE) || 80,
    memoryUsage: parseInt(process.env.THRESHOLD_MEMORY_USAGE) || 85,
    databaseConnections: parseInt(process.env.THRESHOLD_DATABASE_CONNECTIONS) || 50,
    queueDepth: parseInt(process.env.THRESHOLD_QUEUE_DEPTH) || 100
  },
  
  notificationChannels: {
    email: {
      enabled: !!process.env.NOTIFICATION_EMAIL,
      address: process.env.NOTIFICATION_EMAIL
    },
    slack: {
      enabled: !!process.env.NOTIFICATION_SLACK_WEBHOOK,
      webhookUrl: process.env.NOTIFICATION_SLACK_WEBHOOK
    },
    teams: {
      enabled: !!process.env.NOTIFICATION_TEAMS_WEBHOOK,
      webhookUrl: process.env.NOTIFICATION_TEAMS_WEBHOOK
    }
  }
};
```

## Monitoring Service Setup

### 1. Create Monitoring Service

Create `monitoring-service.js`:

```javascript
import { createClient } from '@supabase/supabase-js';
import { ProductionMonitor } from './monitoring/ProductionMonitor.js';
import { monitoringConfig } from './monitoring.config.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const monitor = new ProductionMonitor(supabase, monitoringConfig);

// Start monitoring
monitor.startMonitoring()
  .then(() => {
    console.log('✅ Production monitoring started successfully');
  })
  .catch(error => {
    console.error('❌ Failed to start monitoring:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down monitoring service...');
  await monitor.stopMonitoring();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down monitoring service...');
  await monitor.stopMonitoring();
  process.exit(0);
});
```

### 2. Health Check Endpoint

Create Edge Function for health checks:

```typescript
// supabase/functions/health-check/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Test database connectivity
    const { data: dbTest, error: dbError } = await supabase
      .from('processing_jobs')
      .select('count')
      .limit(1);

    if (dbError) throw dbError;

    // Test storage connectivity
    const { data: storageTest, error: storageError } = await supabase.storage
      .from('pdf-processing')
      .list('', { limit: 1 });

    if (storageError) throw storageError;

    // Return health status
    return new Response(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      components: {
        database: { status: 'healthy', responseTime: 50 },
        storage: { status: 'healthy', responseTime: 100 },
        api: { status: 'healthy', responseTime: 25 }
      }
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    return new Response(JSON.stringify({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 503
    });
  }
});
```

Deploy the health check function:

```bash
supabase functions deploy health-check
```

### 3. Monitoring Dashboard Integration

Add monitoring to your React application:

```typescript
// src/pages/MonitoringPage.tsx
import React from 'react';
import { MonitoringDashboard } from '../components/monitoring/MonitoringDashboard';

export const MonitoringPage: React.FC = () => {
  const handleRefresh = () => {
    // Refresh monitoring data
    window.location.reload();
  };

  const handleExportData = () => {
    // Export monitoring data
    console.log('Exporting monitoring data...');
  };

  return (
    <div className="container mx-auto py-6">
      <MonitoringDashboard 
        onRefresh={handleRefresh}
        onExportData={handleExportData}
      />
    </div>
  );
};
```

Add route to your router:

```typescript
// src/App.tsx
import { MonitoringPage } from './pages/MonitoringPage';

// Add to your routes
{
  path: '/admin/monitoring',
  element: <MonitoringPage />,
  // Add authentication guard
}
```

## Alerting Setup

### 1. Notification Channels

Configure notification channels based on your needs:

#### Email Notifications
```javascript
// monitoring/notifications/EmailNotifier.js
export class EmailNotifier {
  constructor(config) {
    this.config = config;
    // Initialize email service (SendGrid, AWS SES, etc.)
  }

  async sendAlert(alert) {
    const subject = `${alert.severity.toUpperCase()} Alert: ${alert.component}`;
    const body = this.formatEmailBody(alert);
    
    // Send email using your preferred service
    await this.sendEmail(this.config.address, subject, body);
  }

  formatEmailBody(alert) {
    return `
      Alert Details:
      - Component: ${alert.component}
      - Severity: ${alert.severity}
      - Message: ${alert.message}
      - Time: ${alert.timestamp.toLocaleString()}
      - Alert ID: ${alert.id}
    `;
  }
}
```

#### Slack Notifications
```javascript
// monitoring/notifications/SlackNotifier.js
export class SlackNotifier {
  constructor(config) {
    this.webhookUrl = config.webhookUrl;
  }

  async sendAlert(alert) {
    const payload = {
      channel: '#alerts',
      username: 'Monitoring Bot',
      icon_emoji: ':warning:',
      text: this.formatSlackMessage(alert),
      attachments: [{
        color: this.getSeverityColor(alert.severity),
        fields: [
          { title: 'Component', value: alert.component, short: true },
          { title: 'Severity', value: alert.severity, short: true },
          { title: 'Time', value: alert.timestamp.toLocaleString(), short: true }
        ]
      }]
    };

    await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  formatSlackMessage(alert) {
    return `🚨 *${alert.severity.toUpperCase()} Alert*\n${alert.message}`;
  }

  getSeverityColor(severity) {
    const colors = {
      info: '#36a3f7',
      warning: '#ffab00',
      error: '#f44336',
      critical: '#d32f2f'
    };
    return colors[severity] || '#757575';
  }
}
```

### 2. Alert Rules Configuration

```javascript
// monitoring/alertRules.js
export const defaultAlertRules = [
  {
    id: 'high_error_rate',
    name: 'High Error Rate',
    description: 'Alert when error rate exceeds 5%',
    condition: {
      metric: 'errors.rate',
      operator: 'gt',
      threshold: 5,
      duration: 5 // minutes
    },
    severity: 'error',
    enabled: true,
    cooldownPeriod: 15, // minutes
    notificationChannels: ['slack', 'email']
  },
  {
    id: 'api_response_time',
    name: 'High API Response Time',
    description: 'Alert when API response time exceeds 5 seconds',
    condition: {
      metric: 'performance.apiResponseTime',
      operator: 'gt',
      threshold: 5000,
      duration: 3
    },
    severity: 'warning',
    enabled: true,
    cooldownPeriod: 10,
    notificationChannels: ['slack']
  },
  {
    id: 'system_down',
    name: 'System Down',
    description: 'Alert when system health is critical',
    condition: {
      metric: 'health.overall',
      operator: 'eq',
      threshold: 'critical',
      duration: 1
    },
    severity: 'critical',
    enabled: true,
    cooldownPeriod: 5,
    notificationChannels: ['slack', 'email', 'sms']
  }
];
```

## Deployment Scripts

### 1. Monitoring Deployment Script

Create `scripts/deploy-monitoring.sh`:

```bash
#!/bin/bash

set -e

echo "🚀 Deploying monitoring system..."

# Install dependencies
npm install

# Run database migrations
echo "📊 Setting up database schema..."
supabase db push

# Deploy Edge Functions
echo "⚡ Deploying Edge Functions..."
supabase functions deploy health-check
supabase functions deploy monitoring-webhook

# Start monitoring service
echo "👁️ Starting monitoring service..."
pm2 start monitoring-service.js --name "monitoring"

# Test monitoring endpoints
echo "🧪 Testing monitoring endpoints..."
curl -f http://localhost:3000/health-check || exit 1

echo "✅ Monitoring system deployed successfully!"
```

### 2. Package.json Scripts

Add monitoring scripts to `package.json`:

```json
{
  "scripts": {
    "monitoring:start": "node monitoring-service.js",
    "monitoring:status": "node scripts/check-monitoring-status.js",
    "monitoring:dashboard": "node scripts/open-dashboard.js",
    "monitoring:test": "node scripts/test-monitoring.js",
    "monitoring:export": "node scripts/export-metrics.js",
    "monitoring:health": "curl -f http://localhost:3000/health-check",
    "deploy:monitoring": "bash scripts/deploy-monitoring.sh"
  }
}
```

### 3. Process Management

Using PM2 for production:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'monitoring-service',
    script: 'monitoring-service.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/monitoring-error.log',
    out_file: './logs/monitoring-out.log',
    log_file: './logs/monitoring-combined.log',
    time: true
  }]
};
```

Start the monitoring service:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Testing and Validation

### 1. Monitoring System Test

Create `scripts/test-monitoring.js`:

```javascript
import { createClient } from '@supabase/supabase-js';
import { ProductionMonitor } from '../monitoring/ProductionMonitor.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const testConfig = {
  enableRealTimeMonitoring: true,
  metricsRetentionDays: 1,
  alertingEnabled: true,
  slaTargets: {
    apiResponseTime: 2000,
    processingTime: 30,
    errorRate: 1,
    uptime: 99.9
  },
  resourceThresholds: {
    cpuUsage: 80,
    memoryUsage: 85,
    databaseConnections: 50,
    queueDepth: 100
  }
};

async function testMonitoring() {
  console.log('🧪 Testing monitoring system...');
  
  const monitor = new ProductionMonitor(supabase, testConfig);
  
  try {
    // Test health check
    console.log('Testing health check...');
    const metrics = await monitor.performHealthCheck();
    console.log('✅ Health check successful:', metrics.health.overall);
    
    // Test alert system
    console.log('Testing alert system...');
    await monitor.alertManager.sendAlert(
      'system_test',
      'info',
      'test_component',
      'Test alert from monitoring setup'
    );
    console.log('✅ Alert system working');
    
    // Test metrics collection
    console.log('Testing metrics collection...');
    await monitor.metricsCollector.collectAllMetrics();
    console.log('✅ Metrics collection working');
    
    console.log('🎉 All monitoring tests passed!');
    
  } catch (error) {
    console.error('❌ Monitoring test failed:', error);
    process.exit(1);
  }
}

testMonitoring();
```

### 2. Load Testing

Create a simple load test to verify monitoring under stress:

```javascript
// scripts/load-test.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function loadTest() {
  console.log('🔥 Starting load test...');
  
  const promises = [];
  const requestCount = 100;
  
  for (let i = 0; i < requestCount; i++) {
    promises.push(
      supabase
        .from('processing_jobs')
        .select('count')
        .limit(1)
        .then(() => console.log(`Request ${i + 1} completed`))
        .catch(err => console.error(`Request ${i + 1} failed:`, err))
    );
  }
  
  await Promise.all(promises);
  console.log('✅ Load test completed');
}

loadTest();
```

## Maintenance

### 1. Automated Cleanup

Create a cron job for cleanup:

```bash
# Add to crontab
0 2 * * * cd /path/to/your/app && npm run monitoring:cleanup
```

Create cleanup script:

```javascript
// scripts/cleanup-monitoring.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanup() {
  console.log('🧹 Starting monitoring data cleanup...');
  
  try {
    // Run cleanup function
    const { error } = await supabase.rpc('cleanup_old_metrics');
    
    if (error) throw error;
    
    console.log('✅ Cleanup completed successfully');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

cleanup();
```

### 2. Regular Health Checks

Create a script to verify monitoring health:

```javascript
// scripts/check-monitoring-health.js
async function checkMonitoringHealth() {
  try {
    // Check if monitoring service is running
    const response = await fetch('http://localhost:3000/health-check');
    
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ Monitoring service healthy:', data.status);
    
  } catch (error) {
    console.error('❌ Monitoring service unhealthy:', error.message);
    process.exit(1);
  }
}

checkMonitoringHealth();
```

## Troubleshooting

### Common Issues

1. **Monitoring Service Won't Start**
   - Check environment variables
   - Verify database connectivity
   - Check port availability
   - Review logs: `pm2 logs monitoring-service`

2. **Alerts Not Firing**
   - Verify alert rules configuration
   - Check notification channel setup
   - Test webhooks manually
   - Review alert manager logs

3. **High Memory Usage**
   - Adjust metrics buffer size
   - Increase cleanup frequency
   - Check for memory leaks in custom code

4. **Missing Metrics**
   - Verify metrics collector is running
   - Check database permissions
   - Review metrics flush frequency

### Debug Commands

```bash
# Check monitoring service status
pm2 status monitoring-service

# View monitoring logs
pm2 logs monitoring-service --lines 100

# Test database connectivity
npm run db:test

# Test notification channels
npm run alerts:test

# Export recent metrics for analysis
npm run monitoring:export --period 1h > metrics.json
```

---

This setup guide provides a comprehensive monitoring solution for your PDF processing pipeline. Customize the configuration based on your specific requirements and infrastructure setup.