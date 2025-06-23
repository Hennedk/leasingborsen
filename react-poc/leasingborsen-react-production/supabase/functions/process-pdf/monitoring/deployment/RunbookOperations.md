# Production Operations Runbook

## System Overview

### Architecture Components
- **Frontend**: React application with Vite build system
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **PDF Processing**: Node.js service with queue system
- **File Storage**: Supabase Storage with CDN
- **Monitoring**: Production monitoring suite with alerting

### Critical Service Dependencies
- Supabase Database (Primary data store)
- Supabase Storage (File uploads/downloads)
- Edge Functions (PDF processing pipeline)
- Authentication Service (User access control)
- Queue System (Background job processing)

## Common Issues and Resolutions

### 1. High API Response Times

**Symptoms:**
- API response times > 2 seconds
- User complaints about slow loading
- Monitoring alerts for response time SLA violations

**Immediate Actions:**
```bash
# Check current system status
npm run monitoring:status

# Check database performance
supabase db inspect --performance

# Review slow queries
supabase db logs --level=slow
```

**Troubleshooting Steps:**
1. **Check Database Performance**
   ```sql
   -- Check active connections
   SELECT count(*) FROM pg_stat_activity;
   
   -- Check slow queries
   SELECT query, mean_exec_time, calls 
   FROM pg_stat_statements 
   ORDER BY mean_exec_time DESC 
   LIMIT 10;
   
   -- Check table sizes
   SELECT schemaname, tablename, 
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
   FROM pg_tables 
   ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
   ```

2. **Optimize Queries**
   ```sql
   -- Add missing indexes
   CREATE INDEX CONCURRENTLY idx_processing_jobs_status 
   ON processing_jobs(status) WHERE status IN ('pending', 'processing');
   
   -- Update table statistics
   ANALYZE processing_jobs;
   ```

3. **Scale Resources**
   ```bash
   # Scale up database if needed
   supabase db upgrade --instance-size medium
   
   # Monitor impact
   npm run monitoring:dashboard
   ```

**Prevention:**
- Regular database maintenance
- Query performance monitoring
- Proper indexing strategy
- Connection pooling optimization

### 2. PDF Processing Failures

**Symptoms:**
- Jobs stuck in "processing" status
- High error rates in PDF processing
- User reports of failed uploads

**Immediate Actions:**
```bash
# Check processing queue status
npm run queue:status

# Review failed jobs
npm run queue:failed --limit 10

# Check Edge Function logs
supabase functions logs process-pdf
```

**Troubleshooting Steps:**
1. **Check Queue Health**
   ```sql
   -- Check job distribution
   SELECT status, COUNT(*), 
          AVG(EXTRACT(EPOCH FROM (NOW() - created_at))) as avg_age_seconds
   FROM processing_jobs 
   GROUP BY status;
   
   -- Find stuck jobs
   SELECT id, created_at, updated_at, error_message
   FROM processing_jobs 
   WHERE status = 'processing' 
   AND updated_at < NOW() - INTERVAL '30 minutes';
   ```

2. **Restart Stuck Jobs**
   ```sql
   -- Reset stuck jobs to pending
   UPDATE processing_jobs 
   SET status = 'pending', 
       updated_at = NOW(),
       retry_count = retry_count + 1
   WHERE status = 'processing' 
   AND updated_at < NOW() - INTERVAL '30 minutes'
   AND retry_count < 3;
   ```

3. **Check File Storage**
   ```bash
   # Verify storage accessibility
   supabase storage ls pdf-processing
   
   # Test upload functionality
   npm run test:storage
   ```

**Prevention:**
- Regular queue monitoring
- Timeout configurations
- Retry mechanisms
- File validation before processing

### 3. Authentication Issues

**Symptoms:**
- Users unable to log in
- Session timeouts
- Permission denied errors

**Immediate Actions:**
```bash
# Check auth service status
supabase status

# Review auth logs
supabase functions logs auth

# Check RLS policies
npm run db:check-rls
```

**Troubleshooting Steps:**
1. **Check Auth Configuration**
   ```sql
   -- Verify auth users table
   SELECT count(*) FROM auth.users;
   
   -- Check recent auth events
   SELECT event, created_at, count(*)
   FROM auth.audit_log_entries
   WHERE created_at > NOW() - INTERVAL '1 hour'
   GROUP BY event, created_at
   ORDER BY created_at DESC;
   ```

2. **Test Authentication Flow**
   ```bash
   # Test login functionality
   npm run test:auth

   # Verify JWT tokens
   npm run auth:verify-tokens
   ```

3. **Check RLS Policies**
   ```sql
   -- List all RLS policies
   SELECT schemaname, tablename, policyname, permissive, cmd
   FROM pg_policies
   WHERE schemaname = 'public';
   
   -- Test policy for specific user
   SET ROLE authenticated;
   SELECT * FROM processing_jobs LIMIT 1;
   RESET ROLE;
   ```

**Prevention:**
- Regular auth system health checks
- JWT token monitoring
- RLS policy testing
- Session management optimization

### 4. High Error Rates

**Symptoms:**
- Error rate > 5%
- Multiple error alerts
- User-reported issues

**Immediate Actions:**
```bash
# Check error distribution
npm run monitoring:errors

# Review recent error logs
supabase functions logs --level=error

# Check system health
npm run monitoring:health
```

**Troubleshooting Steps:**
1. **Analyze Error Patterns**
   ```sql
   -- Check error types and frequency
   SELECT error_type, COUNT(*), 
          date_trunc('hour', timestamp) as hour
   FROM error_logs
   WHERE timestamp > NOW() - INTERVAL '24 hours'
   GROUP BY error_type, hour
   ORDER BY hour DESC, COUNT(*) DESC;
   ```

2. **Identify Error Sources**
   ```bash
   # Check application logs
   tail -f /var/log/application.log | grep ERROR

   # Review network errors
   npm run monitoring:network
   ```

3. **Implement Fixes**
   ```bash
   # Deploy hotfix if needed
   git checkout hotfix/error-fix
   npm run deploy:hotfix

   # Monitor impact
   npm run monitoring:watch
   ```

**Prevention:**
- Comprehensive error tracking
- Regular error pattern analysis
- Proactive error handling
- Circuit breaker patterns

### 5. Storage Issues

**Symptoms:**
- File upload failures
- Missing files
- Storage quota warnings

**Immediate Actions:**
```bash
# Check storage usage
supabase storage du

# Test storage connectivity
npm run test:storage-health

# Review storage logs
supabase storage logs
```

**Troubleshooting Steps:**
1. **Check Storage Capacity**
   ```bash
   # Check bucket sizes
   supabase storage ls --sizes

   # Check quota usage
   npm run storage:quota-check
   ```

2. **Verify File Integrity**
   ```sql
   -- Check for orphaned file records
   SELECT pj.id, pj.file_path
   FROM processing_jobs pj
   LEFT JOIN storage.objects so ON pj.file_path = so.name
   WHERE pj.file_path IS NOT NULL 
   AND so.name IS NULL;
   ```

3. **Clean Up Storage**
   ```bash
   # Remove orphaned files
   npm run storage:cleanup

   # Optimize storage structure
   npm run storage:optimize
   ```

**Prevention:**
- Regular storage monitoring
- Automated cleanup processes
- File lifecycle management
- Capacity planning

## Monitoring and Alerting

### Key Metrics to Monitor

1. **System Health Metrics**
   - Overall system status
   - Component health status
   - Service availability

2. **Performance Metrics**
   - API response times (95th percentile)
   - Database query performance
   - PDF processing times
   - Queue processing rates

3. **Resource Metrics**
   - CPU utilization
   - Memory usage
   - Database connections
   - Storage usage

4. **Business Metrics**
   - Active users
   - Document processing volume
   - Error rates by feature
   - User satisfaction scores

### Alert Thresholds

| Metric | Warning | Critical | Action Required |
|--------|---------|----------|-----------------|
| API Response Time | > 1.5s | > 3s | Scale/Optimize |
| Error Rate | > 3% | > 10% | Immediate Investigation |
| CPU Usage | > 70% | > 90% | Scale Resources |
| Memory Usage | > 80% | > 95% | Scale Resources |
| Disk Usage | > 80% | > 95% | Add Storage |
| Queue Depth | > 50 jobs | > 200 jobs | Scale Processing |

### Monitoring Commands

```bash
# Real-time system status
npm run monitoring:status

# Performance dashboard
npm run monitoring:dashboard

# Generate health report
npm run monitoring:health-report

# Check SLA compliance
npm run monitoring:sla-report

# Export metrics
npm run monitoring:export --period 24h
```

## Scaling Procedures

### Horizontal Scaling

1. **Application Scaling**
   ```bash
   # Scale web servers
   docker-compose up --scale web=3

   # Verify load distribution
   npm run monitoring:load-balance
   ```

2. **Database Scaling**
   ```bash
   # Add read replicas
   supabase db replica create --region us-east-1

   # Configure read routing
   npm run db:configure-reads
   ```

### Vertical Scaling

1. **Increase Resources**
   ```bash
   # Upgrade database instance
   supabase db upgrade --cpu 4 --memory 16GB

   # Scale edge functions
   supabase functions deploy process-pdf --memory 1024
   ```

2. **Optimize Configuration**
   ```bash
   # Update connection pool
   npm run db:optimize-pool

   # Adjust worker processes
   npm run workers:scale --count 10
   ```

## Backup and Recovery

### Automated Backups

1. **Database Backups**
   ```bash
   # Schedule daily backups
   crontab -e
   # Add: 0 2 * * * npm run backup:database

   # Verify backup integrity
   npm run backup:verify --date yesterday
   ```

2. **File Storage Backups**
   ```bash
   # Backup storage buckets
   npm run backup:storage

   # Sync to secondary location
   npm run backup:sync-remote
   ```

### Recovery Procedures

1. **Database Recovery**
   ```bash
   # Restore from backup
   npm run restore:database --date 2024-01-15

   # Verify data integrity
   npm run db:integrity-check
   ```

2. **File Recovery**
   ```bash
   # Restore files from backup
   npm run restore:files --bucket pdf-processing --date 2024-01-15

   # Verify file accessibility
   npm run test:file-access
   ```

### Disaster Recovery

1. **Full System Recovery**
   ```bash
   # Deploy to disaster recovery environment
   npm run deploy:disaster-recovery

   # Sync data from backups
   npm run dr:sync-data

   # Switch DNS to DR environment
   npm run dr:failover
   ```

2. **Failback Procedures**
   ```bash
   # Sync changes back to primary
   npm run dr:sync-back

   # Switch traffic back to primary
   npm run dr:failback

   # Verify system integrity
   npm run system:health-check
   ```

## Security Procedures

### Security Incident Response

1. **Immediate Response**
   ```bash
   # Isolate affected systems
   npm run security:isolate --component <component>

   # Check for data breaches
   npm run security:breach-check

   # Enable enhanced monitoring
   npm run security:enhanced-monitoring
   ```

2. **Investigation**
   ```bash
   # Collect security logs
   npm run security:collect-logs --period 24h

   # Analyze access patterns
   npm run security:analyze-access

   # Generate incident report
   npm run security:incident-report
   ```

### Regular Security Tasks

1. **Security Scanning**
   ```bash
   # Scan for vulnerabilities
   npm audit
   npm run security:scan

   # Check for exposed secrets
   npm run security:secret-scan
   ```

2. **Access Review**
   ```bash
   # Review user permissions
   npm run security:access-review

   # Audit admin access
   npm run security:admin-audit

   # Check API key usage
   npm run security:api-audit
   ```

## Maintenance Procedures

### Regular Maintenance Tasks

1. **Daily Tasks**
   - Check system health dashboard
   - Review overnight error logs
   - Verify backup completion
   - Monitor resource usage trends

2. **Weekly Tasks**
   - Database maintenance (VACUUM, ANALYZE)
   - Log rotation and cleanup
   - Security patch review
   - Performance trend analysis

3. **Monthly Tasks**
   - Capacity planning review
   - Security audit
   - Disaster recovery testing
   - Documentation updates

### Maintenance Windows

1. **Planned Maintenance**
   ```bash
   # Schedule maintenance window
   npm run maintenance:schedule --date 2024-01-15 --duration 2h

   # Notify users
   npm run maintenance:notify-users

   # Enable maintenance mode
   npm run maintenance:enable
   ```

2. **During Maintenance**
   ```bash
   # Apply updates
   npm run maintenance:apply-updates

   # Test system functionality
   npm run maintenance:test

   # Monitor for issues
   npm run maintenance:monitor
   ```

3. **Post-Maintenance**
   ```bash
   # Disable maintenance mode
   npm run maintenance:disable

   # Verify full functionality
   npm run maintenance:verify

   # Update status page
   npm run status:update
   ```

## Contact Information

### Internal Team
- **Primary On-call**: [Name] - [Phone] - [Email]
- **Secondary On-call**: [Name] - [Phone] - [Email]
- **DevOps Lead**: [Name] - [Phone] - [Email]
- **Database Administrator**: [Name] - [Phone] - [Email]
- **Security Officer**: [Name] - [Phone] - [Email]

### External Vendors
- **Supabase Support**: support@supabase.io
- **Infrastructure Provider**: [Support Number]
- **Monitoring Service**: [Support Number]
- **Security Service**: [Support Number]

### Escalation Matrix
1. **Level 1**: On-call engineer (Response: 15 minutes)
2. **Level 2**: Technical lead (Response: 30 minutes)
3. **Level 3**: Engineering manager (Response: 1 hour)
4. **Level 4**: CTO/VP Engineering (Response: 2 hours)

---

**Last Updated**: [Date]
**Next Review**: [Date]
**Document Owner**: [Name/Team]