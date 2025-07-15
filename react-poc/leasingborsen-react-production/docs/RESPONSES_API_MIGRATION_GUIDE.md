# Responses API Migration Guide

## Overview
This guide documents the migration from OpenAI's Chat Completions API to the new Responses API for the vehicle extraction system. The migration introduces schema-validated structured output, better maintainability, and improved variant consistency tracking.

## Key Features

### 1. Structured Output with JSON Schema
- Schema-validated responses ensure data integrity
- No more regex parsing of AI responses
- Consistent data structure every time

### 2. Variant Tracking System
Each extracted vehicle now includes:
- `variantSource`: "existing" | "reference" | "inferred"
- `variantConfidence`: 0.0 to 1.0 confidence score
- `variantMatchDetails`: Detailed matching information

### 3. Gradual Rollout with Feature Flags
- Phase 1: 5% of dealers
- Phase 2: 25% of dealers  
- Phase 3: 100% deployment
- Emergency disable capability

## Implementation Files

### Core Files Created/Modified

1. **Type Definitions**
   - `supabase/functions/ai-extract-vehicles/types.ts` - Enhanced interfaces with variant tracking

2. **JSON Schema**
   - `supabase/functions/ai-extract-vehicles/schema.ts` - Vehicle extraction validation schema

3. **Variant Resolution**
   - `supabase/functions/ai-extract-vehicles/variantResolver.ts` - Intelligent variant matching logic

4. **Feature Flags**
   - `supabase/functions/ai-extract-vehicles/featureFlags.ts` - Gradual rollout management

5. **Updated Edge Function**
   - `supabase/functions/ai-extract-vehicles/index-with-responses-api.ts` - Main extraction logic with Responses API

6. **Enhanced Comparison**
   - `supabase/functions/compare-extracted-listings/index-with-variant-tracking.ts` - Variant tracking support

7. **Database Migration**
   - `supabase/migrations/20250109_add_migration_monitoring.sql` - Monitoring tables and views

## Configuration

### Environment Variables

```bash
# Edge Function Environment Variables
USE_RESPONSES_API=false                       # Enable Responses API
OPENAI_STORED_PROMPT_ID=pmpt_68677b2c8ebc819584c1af3875e5af5f0bd2f952f3e39828
OPENAI_STORED_PROMPT_VERSION=6
MIGRATION_PHASE=1                             # 1=5%, 2=25%, 3=100%
RESPONSES_API_DEALER_OVERRIDES=               # Force specific dealers
RESPONSES_API_EXCLUDED_DEALERS=               # Exclude specific dealers
RESPONSES_API_EMERGENCY_DISABLE=false         # Emergency switch
```

## Deployment Steps

### Phase 1: Initial Setup (5% Rollout)

1. **Deploy Database Migration**
   ```bash
   supabase db push
   ```

2. **Update Edge Function Environment**
   ```bash
   supabase secrets set USE_RESPONSES_API=true
   supabase secrets set MIGRATION_PHASE=1
   supabase secrets set OPENAI_STORED_PROMPT_ID=pmpt_68677b2c8ebc819584c1af3875e5af5f0bd2f952f3e39828
   supabase secrets set OPENAI_STORED_PROMPT_VERSION=6
   ```

3. **Deploy Updated Edge Functions**
   ```bash
   # Rename new files to replace originals
   mv supabase/functions/ai-extract-vehicles/index-with-responses-api.ts supabase/functions/ai-extract-vehicles/index.ts
   mv supabase/functions/compare-extracted-listings/index-with-variant-tracking.ts supabase/functions/compare-extracted-listings/index.ts
   
   # Deploy functions
   supabase functions deploy ai-extract-vehicles
   supabase functions deploy compare-extracted-listings
   ```

4. **Monitor Initial Rollout**
   ```sql
   -- Check migration metrics
   SELECT * FROM get_migration_dashboard_data();
   
   -- Check for alerts
   SELECT * FROM check_inference_rate_alert();
   ```

### Phase 2: Expanded Rollout (25%)

1. **Verify Phase 1 Success**
   - Inference rate < 20%
   - Error rate < 1%
   - No critical issues reported

2. **Update Migration Phase**
   ```bash
   supabase secrets set MIGRATION_PHASE=2
   ```

3. **Monitor Expanded Rollout**
   - Review variant source distribution
   - Check dealer-specific metrics
   - Analyze inferred variants

### Phase 3: Full Deployment (100%)

1. **Final Validation**
   - All success criteria met
   - Performance benchmarks achieved
   - Cost reduction verified

2. **Complete Rollout**
   ```bash
   supabase secrets set MIGRATION_PHASE=3
   ```

## Monitoring

### Key Metrics to Track

1. **Inference Rate**
   - Target: < 20%
   - Alert threshold: > 20%

2. **Error Rate**
   - Target: < 0.1%
   - Alert threshold: > 1%

3. **Performance**
   - Average response time < 2.5s
   - Token usage reduction ~20%

### Dashboard Queries

```sql
-- Overall migration status
SELECT * FROM get_migration_dashboard_data();

-- Dealer rollout status
SELECT * FROM dealer_migration_metrics;

-- Hourly metrics
SELECT * FROM variant_source_distribution
WHERE hour >= now() - interval '24 hours';

-- Top inferred variants needing review
SELECT 
  extracted_data->>'variant' as variant,
  extracted_data->>'make' as make,
  extracted_data->>'model' as model,
  COUNT(*) as occurrences
FROM extraction_listing_changes
WHERE variant_source = 'inferred'
  AND created_at >= now() - interval '7 days'
GROUP BY 1, 2, 3
ORDER BY occurrences DESC
LIMIT 20;
```

## Emergency Procedures

### Quick Rollback

1. **Set Emergency Disable**
   ```bash
   supabase secrets set RESPONSES_API_EMERGENCY_DISABLE=true
   ```

2. **Or Disable Completely**
   ```bash
   supabase secrets set USE_RESPONSES_API=false
   ```

3. **Monitor Fallback**
   - Verify all extractions using chat-completions
   - Check error rates return to normal

## Troubleshooting

### Common Issues

1. **High Inference Rate**
   - Review prompt effectiveness
   - Update reference data from validated inferences
   - Check PDF quality issues

2. **Schema Validation Errors**
   - Verify prompt version is correct
   - Check for API response format changes
   - Review error logs for patterns

3. **Performance Degradation**
   - Check token usage patterns
   - Verify prompt is optimized
   - Review network latency

## Success Criteria

- ✅ Inference rate < 20%
- ✅ Zero false updates from variant drift
- ✅ 20% reduction in token usage
- ✅ Response time < 2.5s average
- ✅ 100% schema compliance
- ✅ Successful fallback mechanism

## Next Steps

1. **Post-Migration Optimization**
   - Analyze inferred variant patterns
   - Update reference database
   - Optimize prompt based on real data

2. **Long-term Improvements**
   - Build variant suggestion system
   - Create automated review workflows
   - Implement variant history tracking