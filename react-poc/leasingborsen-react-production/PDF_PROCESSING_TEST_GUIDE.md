# PDF Processing System - Complete Testing Guide

This guide provides step-by-step instructions for testing the server-side PDF processing system, from basic functionality to production readiness.

## 📋 Prerequisites

1. **Supabase Project Setup**
   - Active Supabase project with URL and anon key
   - Database migrations applied
   - Edge Function deployment access

2. **Environment Variables**
   ```bash
   # .env.local
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # For Edge Functions (set in Supabase dashboard)
   OPENAI_API_KEY=your_openai_api_key
   ```

3. **Test PDF Files**
   - Volkswagen PDF price list
   - Toyota PDF price list (optional)
   - Test PDFs in `supabase/storage/batch-imports/`

## 🧪 Testing Phases

### Phase 1: Database Setup Testing

1. **Apply Database Migrations**
   ```bash
   # Navigate to project root
   cd /home/hennedk/projects/leasingborsen/react-poc/leasingborsen-react-production
   
   # Apply all migrations in order
   supabase db push
   ```

2. **Verify Tables Created**
   ```sql
   -- Run in Supabase SQL editor
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN (
     'processing_jobs',
     'dealer_configs', 
     'extraction_cache',
     'ai_usage_tracking',
     'pattern_performance',
     'pattern_learning',
     'monitoring_metrics'
   );
   ```

3. **Load Dealer Configurations**
   ```bash
   # Load VW and Toyota configurations
   node scripts/load-dealer-configs.js
   ```

### Phase 2: Edge Function Testing

1. **Deploy Edge Function**
   ```bash
   # Deploy the process-pdf function
   supabase functions deploy process-pdf
   ```

2. **Test Health Check**
   ```bash
   # Test function is running
   curl -L -X GET 'https://[PROJECT_REF].supabase.co/functions/v1/process-pdf/health' \
     -H 'Authorization: Bearer [ANON_KEY]'
   ```

3. **Test Basic Processing**
   ```bash
   # Create test request
   curl -L -X POST 'https://[PROJECT_REF].supabase.co/functions/v1/process-pdf' \
     -H 'Authorization: Bearer [ANON_KEY]' \
     -H 'Content-Type: application/json' \
     -d '{
       "batchId": "test-batch-001",
       "fileUrl": "batch-imports/test-vw.pdf",
       "dealerId": "volkswagen"
     }'
   ```

### Phase 3: Client-Side Integration Testing

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Test VW Batch Upload**
   - Navigate to `/admin/sellers`
   - Find a VW seller and click batch upload icon
   - Upload a VW PDF file
   - Monitor progress in the UI
   - Verify results are displayed correctly

3. **Test Job Monitoring**
   - Navigate to `/admin/processing-jobs`
   - Verify job appears with real-time progress
   - Check AI cost tracking
   - Monitor performance metrics

### Phase 4: Multi-Dealer Testing

1. **Test Auto-Detection**
   ```javascript
   // Test without specifying dealer
   const response = await fetch('/functions/v1/process-pdf', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${supabaseAnonKey}`,
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({
       batchId: 'test-auto-detect',
       fileUrl: 'batch-imports/mystery-dealer.pdf'
     })
   });
   ```

2. **Test Toyota Processing**
   ```javascript
   // Test Toyota configuration
   const response = await fetch('/functions/v1/process-pdf', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${supabaseAnonKey}`,
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({
       batchId: 'test-toyota',
       fileUrl: 'batch-imports/test-toyota.pdf',
       dealerId: 'toyota'
     })
   });
   ```

### Phase 5: Performance Testing

1. **Test Caching**
   ```javascript
   // Process same PDF twice to test caching
   const pdf = 'batch-imports/test-vw.pdf';
   
   // First request (should process)
   const response1 = await processRequest(pdf);
   console.log('First processing time:', response1.processingTime);
   
   // Second request (should use cache)
   const response2 = await processRequest(pdf);
   console.log('Cached processing time:', response2.processingTime);
   // Should be significantly faster
   ```

2. **Load Testing**
   ```javascript
   // Test concurrent processing
   const requests = [];
   for (let i = 0; i < 5; i++) {
     requests.push(processRequest(`test-batch-${i}`, 'test.pdf'));
   }
   
   const results = await Promise.all(requests);
   console.log('Concurrent processing results:', results);
   ```

### Phase 6: AI Extraction Testing

1. **Test Pattern Extraction First**
   - Process a well-formatted VW PDF
   - Verify pattern extraction works without AI
   - Check confidence scores in results

2. **Test AI Fallback**
   - Modify PDF to break pattern matching
   - Verify system falls back to AI extraction
   - Check AI usage tracking in database

3. **Test AI Cost Controls**
   ```sql
   -- Check AI usage and costs
   SELECT 
     dealer_id,
     SUM(tokens_used) as total_tokens,
     SUM(cost_usd) as total_cost,
     COUNT(*) as ai_calls
   FROM ai_usage_tracking
   WHERE created_at > NOW() - INTERVAL '1 day'
   GROUP BY dealer_id;
   ```

### Phase 7: Monitoring & Production Testing

1. **Test Monitoring Dashboard**
   - Navigate to `/admin/monitoring`
   - Verify real-time metrics display
   - Check health status indicators
   - Test alert configurations

2. **Test Alert System**
   ```javascript
   // Trigger test alert
   const response = await fetch('/api/monitoring/test-alert', {
     method: 'POST',
     body: JSON.stringify({
       type: 'error',
       message: 'Test alert from PDF processing'
     })
   });
   ```

3. **Performance Benchmarks**
   ```bash
   # Run performance tests
   npm run test:performance
   
   # Expected results:
   # - Processing time: < 30s per PDF
   # - Memory usage: < 512MB
   # - Cache hit rate: > 70%
   # - AI cost: < $0.50 per PDF
   ```

## 🧪 Unit Testing

1. **Run All Tests**
   ```bash
   # Run the test suite
   npm run test
   
   # Run with coverage
   npm run test:coverage
   ```

2. **Test Specific Components**
   ```bash
   # Test pattern learning
   npm run test -- PatternLearningEngine
   
   # Test performance optimizer
   npm run test -- PerformanceOptimizer
   
   # Test cross-dealer validation
   npm run test -- CrossDealerValidator
   ```

## 🐛 Debugging Tools

1. **Check Processing Job Status**
   ```sql
   -- View recent jobs
   SELECT 
     id,
     batch_id,
     status,
     progress_percentage,
     error_message,
     created_at
   FROM processing_jobs
   ORDER BY created_at DESC
   LIMIT 10;
   ```

2. **Monitor AI Usage**
   ```sql
   -- Check AI usage patterns
   SELECT 
     DATE(created_at) as date,
     COUNT(*) as requests,
     SUM(tokens_used) as tokens,
     SUM(cost_usd) as cost
   FROM ai_usage_tracking
   GROUP BY DATE(created_at)
   ORDER BY date DESC;
   ```

3. **Debug Extraction Results**
   ```sql
   -- View extraction cache
   SELECT 
     id,
     dealer_id,
     extraction_method,
     confidence_score,
     created_at
   FROM extraction_cache
   ORDER BY created_at DESC
   LIMIT 10;
   ```

## 🔍 Common Issues & Solutions

### Issue: Edge Function Not Responding
```bash
# Check function logs
supabase functions logs process-pdf --tail

# Restart function
supabase functions delete process-pdf
supabase functions deploy process-pdf
```

### Issue: AI Extraction Failing
```bash
# Verify OpenAI API key
supabase secrets list

# Test OpenAI connectivity
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Issue: Database Connection Errors
```sql
-- Check connection pool
SELECT count(*) 
FROM pg_stat_activity 
WHERE application_name = 'process-pdf';

-- Reset connections if needed
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE application_name = 'process-pdf';
```

## 📊 Success Criteria

✅ **Functional Tests**
- [ ] VW PDF processes successfully
- [ ] Toyota PDF processes successfully  
- [ ] Auto-detection works correctly
- [ ] Progress tracking updates in real-time
- [ ] Results display in admin UI

✅ **Performance Tests**
- [ ] Processing completes in < 30 seconds
- [ ] Cache hit rate > 70%
- [ ] Memory usage < 512MB
- [ ] Concurrent processing works

✅ **Quality Tests**
- [ ] Extraction accuracy > 90%
- [ ] Validation catches invalid data
- [ ] Cross-dealer standardization works
- [ ] AI fallback activates when needed

✅ **Production Tests**
- [ ] Monitoring dashboard displays metrics
- [ ] Alerts trigger correctly
- [ ] Error handling works gracefully
- [ ] System recovers from failures

## 🚀 Production Deployment Checklist

Before deploying to production:

1. [ ] All tests passing
2. [ ] Database migrations applied
3. [ ] Edge functions deployed
4. [ ] Environment variables configured
5. [ ] Monitoring setup complete
6. [ ] Alert channels configured
7. [ ] Backup procedures tested
8. [ ] Documentation updated
9. [ ] Team training completed
10. [ ] Rollback plan prepared

## 📚 Additional Resources

- [System Architecture Documentation](./supabase/functions/process-pdf/README.md)
- [Monitoring Setup Guide](./supabase/functions/process-pdf/monitoring/docs/MonitoringSetup.md)
- [Production Checklist](./supabase/functions/process-pdf/monitoring/docs/ProductionChecklist.md)
- [Operations Runbook](./supabase/functions/process-pdf/monitoring/docs/RunbookOperations.md)

---

For support or questions, consult the documentation or contact the development team.