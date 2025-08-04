# AI Extraction System - Detailed Documentation

Comprehensive guide to the AI-powered PDF extraction system for automated dealer inventory updates.

## System Architecture

### Extraction Workflow
```
PDF Upload → ai-extract-vehicles → compare-extracted-listings → apply-extraction-changes
    ↓              ↓                        ↓                           ↓
PDF Proxy    AI Processing           Comparison Review           Database Updates
```

## Edge Functions Detail

### ai-extract-vehicles
**Purpose**: Extract vehicle data from PDF price lists using AI

**Features**:
- Multi-provider support (OpenAI GPT-3.5/4, Anthropic Claude)
- Cost tracking with budget management
- Rate limiting to prevent API abuse
- Intelligent retry with exponential backoff
- Structured data extraction with validation

**Request Flow**:
1. PDF uploaded via multipart form
2. PDF converted to text
3. AI processes text with structured prompt
4. Response validated against schema
5. Data stored in extraction_sessions

### compare-extracted-listings
**Purpose**: Compare extracted data with existing inventory

**Comparison Logic**:
- Exact match: VIN comparison
- Fuzzy match: Make + Model + Variant
- Confidence scoring for matches
- Change detection (CREATE/UPDATE/DELETE)

**Output**:
- Side-by-side comparison view
- Change summary statistics
- Confidence indicators
- Action recommendations

### apply-extraction-changes
**Purpose**: Apply reviewed changes to database with RLS bypass

**Key Features**:
- Service role authentication (bypasses RLS)
- Transactional processing
- Comprehensive error handling
- Change-by-change tracking
- Rollback capability

**Input Format**:
```typescript
{
  sessionId: string,
  selectedChangeIds: string[],
  appliedBy: string
}
```

### pdf-proxy
**Purpose**: Secure PDF download with SSRF protection

**Security Features**:
- Database-driven URL whitelisting
- IP range blocking (private networks)
- DNS validation
- HTTPS enforcement
- 5-minute domain cache

## Extraction Change Types

### CREATE Operations
Insert new listings with complete data:
- Validate all required fields
- Resolve reference IDs (make_id, model_id, etc.)
- Create lease_pricing records
- Set appropriate status

**Example Flow**:
```sql
-- 1. Resolve references
SELECT id FROM makes WHERE name = 'Toyota';
SELECT id FROM models WHERE name = 'Corolla';

-- 2. Insert listing
INSERT INTO listings (seller_id, make_id, model_id, ...) 
VALUES (...);

-- 3. Insert pricing
INSERT INTO lease_pricing (listing_id, monthly_price, ...)
VALUES (...);
```

### UPDATE Operations
Differential updates to existing listings:
- Only update changed fields
- Preserve unmodified data
- Replace lease pricing if changed
- Update timestamps

**Update Strategy**:
```typescript
// Build dynamic update
const updates = []
if (data.price !== existing.price) {
  updates.push('monthly_price = $1')
}
if (data.mileage !== existing.mileage) {
  updates.push('mileage = $2')
}
// Apply only necessary changes
```

### DELETE Operations
Cascaded deletion with proper cleanup:

**Deletion Order**:
1. Remove extraction_listing_changes references
2. Delete price_change_log entries
3. Delete lease_pricing records
4. Delete listings record

**Critical Fix (July 2025)**:
- ALL unmatched listings marked for deletion
- No model-specific restrictions
- Handles partial inventory uploads correctly

## Column Mapping & Fixes

### Historical Issues Resolved
1. **engine_info → engine_size_cm3** (July 2025)
2. **duration_months → period_months** (July 2025)
3. **colour column removed** (not in schema)
4. **Ambiguous listing_id** (January 2025)

### Current Mapping
```typescript
const columnMapping = {
  // PDF Field → Database Column
  'Motor': 'engine_size_cm3',
  'Periode': 'period_months',
  'Km/år': 'mileage_per_year',
  'Pris/md': 'monthly_price',
  'Førstegangsydelse': 'first_payment'
}
```

## AI Provider Configuration

### OpenAI Setup
```typescript
{
  model: 'gpt-4',
  temperature: 0.1,  // Low for consistency
  max_tokens: 4000,
  response_format: { type: "json_object" }
}
```

### Anthropic Setup
```typescript
{
  model: 'claude-3-sonnet',
  temperature: 0.1,
  max_tokens: 4000,
  system: "Extract structured vehicle data..."
}
```

### Prompt Management
- Prompts versioned in OpenAI Playground
- Version tracked in `responses_api_configs`
- Update via SQL (no redeploy needed)

## Error Handling

### Common Errors & Solutions

**"Failed to extract vehicles"**
- Check `api_call_logs` for AI errors
- Verify PDF is text-based (not scanned)
- Confirm seller_id exists
- Review prompt version

**"No changes applied"**
- Verify extraction session status
- Check user has admin role
- Review selected change IDs
- Check for RLS violations

**"Column doesn't exist"**
- Verify column mapping is current
- Check for schema migrations
- Review extraction data structure

**"Foreign key violation"**
- Ensure references exist (makes, models)
- Check deletion order
- Verify cascade rules

### Error Recovery
```typescript
try {
  // Apply change
  await applyChange(change)
} catch (error) {
  // Log detailed error
  await logError({
    changeId: change.id,
    error: error.message,
    context: change
  })
  
  // Continue with next change
  failedChanges.push(change.id)
}
```

## Testing & Validation

### Test PDF Upload
```bash
curl -X POST http://localhost:54321/functions/v1/ai-extract-vehicles \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test-dealer-inventory.pdf" \
  -F "sellerId=123e4567-e89b-12d3-a456-426614174000"
```

### Validation Rules
1. **Required Fields**: make, model, monthly_price
2. **Price Range**: 1000-50000 DKK/month
3. **Mileage**: 5000-50000 km/year
4. **Period**: 12-60 months

### Data Quality Checks
- Duplicate detection (VIN/registration)
- Price anomaly detection
- Missing data warnings
- Format standardization

## Performance Optimization

### Batch Processing
- Process PDFs up to 10MB
- Chunk large inventories
- Parallel AI requests where possible
- Progress tracking for long operations

### Caching Strategy
- 5-minute seller domain cache
- 1-hour reference data cache
- Session-based extraction cache
- React Query frontend cache

### Database Optimization
```sql
-- Indexes for extraction performance
CREATE INDEX idx_extraction_sessions_seller 
ON extraction_sessions(seller_id, created_at DESC);

CREATE INDEX idx_extraction_changes_session 
ON extraction_listing_changes(session_id, change_type);
```

## Monitoring & Analytics

### Key Metrics
- Extraction success rate
- Average processing time
- AI cost per extraction
- Change accuracy rate

### Monitoring Queries
```sql
-- Daily extraction summary
SELECT 
  DATE(created_at) as date,
  COUNT(*) as extractions,
  AVG(total_cost) as avg_cost,
  SUM(created_count + updated_count + deleted_count) as total_changes
FROM extraction_sessions
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Provider performance
SELECT 
  ai_provider,
  COUNT(*) as usage_count,
  AVG(cost) as avg_cost,
  AVG(tokens_used) as avg_tokens
FROM api_call_logs
WHERE service = 'ai-extract-vehicles'
GROUP BY ai_provider;
```

## Security Considerations

### Input Validation
- File type verification (PDF only)
- Size limits (10MB max)
- Malware scanning hooks
- Content sanitization

### Access Control
- Admin-only extraction review
- Service role for database writes
- Audit logging for all changes
- Session-based authorization

### Data Privacy
- No PII in extraction logs
- Secure PDF storage
- Temporary file cleanup
- Encrypted API keys

## Troubleshooting Guide

### Debug Checklist
1. Check Edge Function logs
2. Review extraction session status
3. Verify PDF format compatibility
4. Check AI provider availability
5. Review change application logs

### Common Fixes
- **Timeout**: Reduce PDF size or split
- **Parse errors**: Check PDF text layer
- **Missing data**: Review AI prompt
- **Duplicates**: Check matching logic

### Support Queries
```sql
-- Get extraction details
SELECT * FROM extraction_sessions 
WHERE id = 'session-uuid';

-- View changes
SELECT * FROM extraction_listing_changes 
WHERE session_id = 'session-uuid';

-- Check errors
SELECT * FROM api_call_logs 
WHERE correlation_id = 'session-uuid' 
AND error IS NOT NULL;
```