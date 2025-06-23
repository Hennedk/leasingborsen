# Production Monitoring System

## Overview

This comprehensive production monitoring system provides enterprise-level monitoring, alerting, and operational visibility for the PDF processing pipeline. It includes real-time health checks, performance metrics, SLA monitoring, automated alerting, and operational dashboards.

## Features

### 🏥 Health Monitoring
- **Real-time System Health**: Continuous monitoring of all system components
- **Component Health Checks**: Database, API, PDF processing, file storage, queue system, auth service, and background jobs
- **Health Trends Analysis**: Historical health data with trend detection
- **Automated Health Reports**: Daily and weekly health summaries

### 📊 Performance Monitoring
- **API Response Time Tracking**: 95th percentile response time monitoring
- **Processing Time Analysis**: PDF processing performance metrics
- **Throughput Monitoring**: System capacity and processing rates
- **Resource Utilization**: CPU, memory, disk, and database connection monitoring

### 🚨 Intelligent Alerting
- **Multi-Channel Notifications**: Email, Slack, Teams, Discord, SMS, and webhook support
- **Severity-Based Escalation**: Automatic escalation based on alert severity and duration
- **Alert Rules Engine**: Configurable alert conditions and thresholds
- **Alert Correlation**: Smart grouping of related alerts to reduce noise

### 📈 SLA Monitoring
- **SLA Compliance Tracking**: Uptime, response time, error rate, and processing time SLAs
- **Violation Detection**: Real-time SLA violation alerts with root cause analysis
- **SLA Reporting**: Automated daily, weekly, and monthly SLA reports
- **Trend Analysis**: SLA performance trends and forecasting

### 📊 Analytics & Reporting
- **Performance Dashboards**: Real-time and historical performance visualization
- **Capacity Planning**: Resource usage trends and capacity forecasting
- **Error Analysis**: Error pattern detection and root cause analysis
- **Usage Analytics**: User activity and system usage patterns

### 🔧 Operational Tools
- **Production Deployment Checklist**: Comprehensive pre-deployment validation
- **Runbook Operations**: Step-by-step troubleshooting guides
- **Backup & Recovery**: Automated backup and disaster recovery procedures
- **Maintenance Windows**: Planned maintenance management

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Monitoring Dashboard                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │   Health    │ │ Performance │ │     SLA     │           │
│  │   Status    │ │   Metrics   │ │ Compliance  │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                  Production Monitor                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │   Health    │ │   Metrics   │ │    Alert    │           │
│  │   Checker   │ │  Collector  │ │   Manager   │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                    System Components                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │  Database   │ │     API     │ │ PDF Process │           │
│  │             │ │             │ │             │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ File Storage│ │Queue System │ │Auth Service │           │
│  │             │ │             │ │             │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Prerequisites

```bash
# Install Node.js 18+
node --version  # Should be 18.0.0 or higher

# Install required global packages
npm install -g pm2 supabase

# Verify Supabase CLI
supabase --version
```

### 2. Environment Setup

```bash
# Clone the repository
git clone https://github.com/your-org/pdf-processing-monitoring.git
cd pdf-processing-monitoring

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.production

# Configure environment variables
nano .env.production
```

### 3. Database Setup

```bash
# Initialize Supabase project
supabase init

# Link to your project
supabase link --project-ref your-project-ref

# Run database migrations
npm run db:migrate

# Verify setup
npm run db:test
```

### 4. Deploy Monitoring System

```bash
# Deploy to production
npm run deploy:monitoring

# Or use the deployment script directly
./scripts/deploy-monitoring.sh production
```

### 5. Verify Installation

```bash
# Check system status
npm run monitoring:status

# Test health endpoint
curl http://localhost:3000/health-check

# View monitoring dashboard
open http://localhost:3000/dashboard
```

## Configuration

### Environment Variables

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
SLA_API_RESPONSE_TIME=2000      # milliseconds
SLA_PROCESSING_TIME=30          # seconds
SLA_ERROR_RATE=1                # percentage
SLA_UPTIME=99.9                 # percentage

# Resource Thresholds
THRESHOLD_CPU_USAGE=80          # percentage
THRESHOLD_MEMORY_USAGE=85       # percentage
THRESHOLD_DATABASE_CONNECTIONS=50
THRESHOLD_QUEUE_DEPTH=100

# Notification Settings
NOTIFICATION_EMAIL=alerts@yourcompany.com
NOTIFICATION_SLACK_WEBHOOK=your_slack_webhook_url
NOTIFICATION_TEAMS_WEBHOOK=your_teams_webhook_url
```

### Notification Channels

#### Slack Integration
```bash
# Set up Slack webhook
NOTIFICATION_SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# Configure channel and formatting
SLACK_CHANNEL=#alerts
SLACK_USERNAME=MonitoringBot
```

#### Email Notifications
```bash
# Configure email settings
NOTIFICATION_EMAIL=alerts@yourcompany.com
EMAIL_SMTP_HOST=smtp.yourprovider.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=your_email_user
EMAIL_SMTP_PASS=your_email_password
```

#### Teams Integration
```bash
# Set up Teams webhook
NOTIFICATION_TEAMS_WEBHOOK=https://yourorg.webhook.office.com/webhookb2/YOUR/TEAMS/WEBHOOK
```

## Usage

### Monitoring Commands

```bash
# Start monitoring service
npm run monitoring:start

# Check monitoring status
npm run monitoring:status

# View real-time dashboard
npm run monitoring:dashboard

# Generate health report
npm run health:report

# Check SLA compliance
npm run sla:check

# Export metrics
npm run metrics:export --period 24h
```

### Alert Management

```bash
# Test alert system
npm run alerts:test

# List active alerts
npm run alerts:list

# Acknowledge alert
npm run alerts:acknowledge --id alert_123

# Resolve alert
npm run alerts:resolve --id alert_123
```

### Performance Analysis

```bash
# Analyze system performance
npm run performance:analyze

# Run performance benchmark
npm run performance:benchmark

# Generate capacity report
npm run capacity:report

# Forecast capacity needs
npm run capacity:forecast
```

### Maintenance Operations

```bash
# Enable maintenance mode
npm run maintenance:start

# Check maintenance status
npm run maintenance:status

# Disable maintenance mode
npm run maintenance:stop

# Clean up old data
npm run monitoring:cleanup

# Create system backup
npm run backup:create
```

## Monitoring Metrics

### System Health Metrics
- **Overall Health Status**: healthy | degraded | critical
- **Component Health**: Individual component status and response times
- **Error Counts**: Component-specific error tracking
- **Availability**: System uptime and downtime tracking

### Performance Metrics
- **API Response Time**: Average and 95th percentile response times
- **Processing Time**: PDF processing duration statistics
- **Throughput**: Requests per minute and documents processed
- **Queue Length**: Background job queue depth

### Resource Metrics
- **CPU Usage**: System CPU utilization percentage
- **Memory Usage**: Memory utilization and available memory
- **Database Connections**: Active database connection count
- **Disk Usage**: Storage utilization across all volumes

### Business Metrics
- **Active Users**: Current active user count
- **Request Volume**: API request rates and patterns
- **Document Processing**: Document processing volume and success rates
- **Error Rates**: System error rates by category and severity

## Alerting Rules

### Default Alert Rules

| Rule | Condition | Severity | Threshold | Duration |
|------|-----------|----------|-----------|----------|
| High Error Rate | error_rate > 5% | Error | 5% | 5 min |
| API Response Time | response_time > 5s | Warning | 5000ms | 3 min |
| System Down | health = critical | Critical | critical | 1 min |
| High CPU Usage | cpu_usage > 90% | Critical | 90% | 5 min |
| High Memory Usage | memory_usage > 95% | Critical | 95% | 5 min |
| Queue Backlog | queue_depth > 100 | Warning | 100 jobs | 10 min |
| Processing Failure | processing_success < 95% | Error | 95% | 15 min |

### Custom Alert Rules

```javascript
// Add custom alert rule
await alertManager.addAlertRule({
  id: 'custom_metric_alert',
  name: 'Custom Metric Alert',
  description: 'Alert on custom business metric',
  condition: {
    metric: 'business.conversion_rate',
    operator: 'lt',
    threshold: 80,
    duration: 10
  },
  severity: 'warning',
  enabled: true,
  cooldownPeriod: 30,
  notificationChannels: ['slack', 'email']
});
```

## SLA Monitoring

### Default SLA Targets
- **API Response Time**: < 2 seconds (95th percentile)
- **Processing Time**: < 30 seconds (average)
- **Error Rate**: < 1% (hourly average)
- **System Uptime**: > 99.9% (monthly)

### SLA Reports
```bash
# Generate daily SLA report
npm run sla:report --period daily

# Generate monthly SLA report
npm run sla:report --period monthly

# Email SLA report
npm run sla:report --period weekly --email alerts@company.com
```

## Dashboard Features

### Overview Dashboard
- **System Health Summary**: Real-time system status
- **Active Alerts**: Current alerts and their severity
- **Performance Metrics**: Key performance indicators
- **Resource Utilization**: Current resource usage

### Performance Dashboard
- **Response Time Trends**: Historical API response times
- **Throughput Analysis**: Request volume and processing rates
- **Error Rate Tracking**: Error trends and patterns
- **Queue Performance**: Background job processing metrics

### SLA Dashboard
- **SLA Compliance**: Current compliance status for all SLAs
- **Violation History**: Recent SLA violations and trends
- **Performance Benchmarks**: Performance vs. SLA targets
- **Improvement Recommendations**: Automated suggestions

## Troubleshooting

### Common Issues

#### Monitoring Service Won't Start
```bash
# Check environment variables
npm run setup:env

# Verify database connectivity
npm run db:test

# Check port availability
netstat -tulpn | grep :3000

# Review logs
npm run logs:monitoring
```

#### Alerts Not Firing
```bash
# Test alert system
npm run alerts:test

# Check notification channels
npm run alerts:test-notifications

# Verify alert rules
npm run alerts:list-rules
```

#### Missing Metrics
```bash
# Check metrics collector
pm2 logs metrics-collector

# Verify database permissions
npm run db:check-permissions

# Test metrics collection
npm run metrics:collect --test
```

#### High Resource Usage
```bash
# Check system resources
npm run monitoring:resources

# Analyze memory usage
npm run monitoring:memory-analysis

# Check for memory leaks
npm run monitoring:leak-detection
```

### Debug Commands

```bash
# Enable debug logging
DEBUG=monitoring:* npm run monitoring:start

# Export debug information
npm run monitoring:debug-export

# Run system diagnostics
npm run monitoring:diagnostics

# Validate configuration
npm run monitoring:validate-config
```

## API Reference

### Health Check API
```http
GET /health-check
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "components": {
    "database": {
      "status": "healthy",
      "responseTime": 150
    },
    "api": {
      "status": "healthy",
      "responseTime": 200
    }
  }
}
```

### Metrics API
```http
GET /api/metrics?period=24h&granularity=hour
```

### Alerts API
```http
GET /api/alerts?severity=critical&limit=10
POST /api/alerts/{id}/acknowledge
POST /api/alerts/{id}/resolve
```

### SLA API
```http
GET /api/sla/report?period=30d
GET /api/sla/compliance
```

## Security

### Access Control
- **Role-based Access**: Different access levels for monitoring data
- **API Authentication**: JWT-based API authentication
- **Audit Logging**: All monitoring actions are logged
- **Data Encryption**: Sensitive monitoring data is encrypted

### Security Best Practices
- Regular security scans: `npm run security:scan`
- Access review: `npm run security:access-review`
- Secret rotation: `npm run security:rotate-secrets`
- Vulnerability monitoring: `npm run security:vulnerability-scan`

## Backup and Recovery

### Automated Backups
```bash
# Schedule daily backups
0 2 * * * cd /path/to/monitoring && npm run backup:create

# Verify backup integrity
npm run backup:verify --date yesterday

# List available backups
npm run backup:list
```

### Disaster Recovery
```bash
# Deploy to disaster recovery environment
npm run deploy:disaster-recovery

# Failover to DR environment
npm run dr:failover

# Failback to primary environment
npm run dr:failback
```

## Performance Optimization

### Resource Optimization
```bash
# Optimize database queries
npm run db:optimize

# Tune application performance
npm run performance:tune

# Optimize memory usage
npm run memory:optimize
```

### Scaling
```bash
# Scale monitoring services
npm run scale:monitoring --instances 3

# Scale database connections
npm run db:scale-connections

# Scale alert processing
npm run alerts:scale-workers
```

## Contributing

### Development Setup
```bash
# Install development dependencies
npm install --include=dev

# Run in development mode
npm run dev

# Run tests
npm test

# Run linting
npm run lint
```

### Testing
```bash
# Run all tests
npm test

# Run monitoring tests
npm run test:monitoring

# Run integration tests
npm run test:integration

# Run load tests
npm run test:load
```

## Support

### Documentation
- [Production Deployment Checklist](./deployment/ProductionChecklist.md)
- [Operations Runbook](./deployment/RunbookOperations.md)
- [Monitoring Setup Guide](./deployment/MonitoringSetup.md)

### Getting Help
- **Issues**: Report bugs and feature requests on GitHub
- **Discussions**: Community discussions and Q&A
- **Support**: Enterprise support available

### Contact Information
- **Technical Support**: support@yourcompany.com
- **Security Issues**: security@yourcompany.com
- **General Questions**: info@yourcompany.com

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes and improvements.