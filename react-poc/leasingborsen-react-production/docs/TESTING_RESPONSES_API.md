# Testing the Responses API Migration

## 1. Quick Test Script

Run the test script I created:

```bash
cd /home/hennedk/projects/leasingborsen/react-poc/leasingborsen-react-production
node scripts/test-responses-api.js
```

This will:
- Test extraction with known dealers (should match existing variants)
- Test with new variants (should be inferred)
- Show which API version was used
- Display variant source statistics
- Check for any alerts

## 2. Manual Testing via UI

### Test a Specific Dealer

1. **Force a dealer to use Responses API:**
   ```bash
   # Add a dealer to the override list
   supabase secrets set RESPONSES_API_DEALER_OVERRIDES="f5cdd423-d949-49fa-a68d-937c25c2269a"
   ```

2. **Upload a PDF through the admin interface:**
   - Go to `/admin/listings`
   - Select "Volkswagen Privatleasing" 
   - Upload a PDF
   - Check the extraction results

3. **Verify in the database:**
   ```sql
   -- Check latest extraction session
   SELECT 
     id,
     session_name,
     api_version,
     inference_rate,
     variant_source_stats
   FROM extraction_sessions
   ORDER BY created_at DESC
   LIMIT 5;
   ```

## 3. Direct Edge Function Testing

### Test with cURL

```bash
# Set your environment variables
SUPABASE_URL="your_supabase_url"
SUPABASE_ANON_KEY="your_anon_key"

# Test extraction
curl -X POST "$SUPABASE_URL/functions/v1/ai-extract-vehicles" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Volkswagen Golf\n1.5 TSI Life 150 HK\nPris: 3.495 kr./md\nFørstegangsydelse: 35.000 kr.\n36 måneder - 15.000 km/år",
    "dealerHint": "Volkswagen Privatleasing",
    "sellerId": "f5cdd423-d949-49fa-a68d-937c25c2269a",
    "fileName": "test-golf.pdf"
  }'
```

## 4. Monitor Testing Results

### Check Migration Dashboard

```sql
-- Overall status
SELECT * FROM get_migration_dashboard_data();

-- Detailed metrics for your tests
SELECT 
  created_at,
  api_version,
  dealer_id,
  inference_rate,
  variant_distribution,
  tokens_used,
  processing_time_ms,
  error_occurred,
  error_message
FROM migration_metrics
WHERE created_at > now() - interval '1 hour'
ORDER BY created_at DESC;

-- Check variant sources
SELECT * FROM variant_source_distribution
WHERE hour >= now() - interval '1 hour';

-- Check dealer-specific metrics
SELECT * FROM dealer_migration_metrics
WHERE dealer_name = 'Volkswagen Privatleasing';
```

### Check Extraction Details

```sql
-- View recent extraction changes with variant info
SELECT 
  elc.id,
  elc.change_type,
  elc.variant_source,
  elc.variant_confidence,
  elc.extracted_data->>'variant' as variant,
  elc.extracted_data->>'make' as make,
  elc.extracted_data->>'model' as model,
  elc.match_details
FROM extraction_listing_changes elc
JOIN extraction_sessions es ON elc.session_id = es.id
WHERE es.created_at > now() - interval '1 hour'
ORDER BY elc.created_at DESC
LIMIT 20;
```

## 5. Testing Different Scenarios

### A. Test Variant Matching (Existing Inventory)

Upload a PDF with vehicles that exist in the dealer's inventory. Expected:
- `variantSource`: "existing"
- `variantConfidence`: > 0.8
- Low inference rate

### B. Test New Variants (Inferred)

Upload a PDF with completely new models. Expected:
- `variantSource`: "inferred"
- `variantConfidence`: ~0.5
- Higher inference rate

### C. Test Fallback Mechanism

1. **Trigger a schema validation error:**
   ```bash
   # Temporarily set invalid prompt version
   supabase secrets set OPENAI_STORED_PROMPT_VERSION=999
   ```

2. Test extraction - should fall back to Chat Completions

3. **Reset:**
   ```bash
   supabase secrets set OPENAI_STORED_PROMPT_VERSION=6
   ```

### D. Test Emergency Disable

```bash
# Enable emergency disable
supabase secrets set RESPONSES_API_EMERGENCY_DISABLE=true

# Test extraction - should use Chat Completions

# Re-enable
supabase secrets set RESPONSES_API_EMERGENCY_DISABLE=false
```

## 6. Performance Testing

### Compare API Performance

```sql
-- Compare response times
SELECT 
  api_version,
  COUNT(*) as count,
  AVG(processing_time_ms) as avg_time,
  MIN(processing_time_ms) as min_time,
  MAX(processing_time_ms) as max_time,
  AVG(tokens_used) as avg_tokens
FROM migration_metrics
WHERE created_at > now() - interval '24 hours'
GROUP BY api_version;

-- Compare inference rates
SELECT 
  api_version,
  AVG(inference_rate) as avg_inference_rate,
  COUNT(*) FILTER (WHERE inference_rate > 0.2) as high_inference_count
FROM migration_metrics
WHERE created_at > now() - interval '24 hours'
GROUP BY api_version;
```

## 7. Rollout Testing

### Test Hash-Based Assignment

```javascript
// Test which dealers are in the 5% rollout
const dealers = [
  { id: 'f5cdd423-d949-49fa-a68d-937c25c2269a', name: 'Volkswagen' },
  { id: '1ffb3762-0ac5-4901-98aa-2fa039e4b0a7', name: 'Toyota' },
  { id: 'b64d9640-adb3-45b9-9a8d-cc5e4ae5caaa', name: 'BMW' },
  // Add more dealers
];

dealers.forEach(dealer => {
  // Hash function from featureFlags.ts
  let hash = 0;
  for (let i = 0; i < dealer.id.length; i++) {
    const char = dealer.id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const normalized = Math.abs(hash) / 2147483647;
  const inRollout = normalized < 0.05; // 5% threshold
  
  console.log(`${dealer.name}: ${inRollout ? 'IN' : 'OUT'} (${(normalized * 100).toFixed(2)}%)`);
});
```

## 8. Troubleshooting

### Check Logs

```bash
# View Edge Function logs
supabase functions logs ai-extract-vehicles --tail 50

# Check for errors
supabase functions logs ai-extract-vehicles --tail 100 | grep -i error
```

### Common Issues

1. **All extractions using Chat Completions:**
   - Check if `USE_RESPONSES_API=true`
   - Verify dealer is in rollout percentage
   - Check for emergency disable

2. **High inference rate:**
   - Review existing inventory data
   - Check variant matching logic
   - Verify prompt is working correctly

3. **Schema validation errors:**
   - Check prompt ID and version
   - Verify JSON schema compatibility
   - Review error logs for details

## Expected Results

When testing is successful, you should see:

1. **For dealers in the 5% rollout:**
   - `api_version`: "responses-api"
   - Structured variant tracking
   - Lower token usage (~20% reduction)

2. **For dealers outside rollout:**
   - `api_version`: "chat-completions"
   - Normal operation continues

3. **Monitoring shows:**
   - Inference rate < 20%
   - No critical errors
   - Consistent performance

Run these tests to verify the Responses API migration is working correctly!