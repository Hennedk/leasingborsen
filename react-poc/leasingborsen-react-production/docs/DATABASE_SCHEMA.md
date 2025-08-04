# Database Schema - Leasingborsen Platform

Complete database architecture documentation for the Danish car leasing platform.

## Overview

**Total Schema**: 20 tables + 2 views + 15 functions = Highly streamlined, efficient database

## Complete Database Schema (Updated July 27, 2025) - Phase 3 Simplified

### Core Business Tables (10 tables)
- **listings** (33 columns) - Primary car listings with lease scores and pricing
- **lease_pricing** (6 columns) - Lease pricing offers for listings
- **sellers** (15 columns) - Car dealers and sellers
- **makes** (2 columns) - Car manufacturers
- **models** (3 columns) - Car models by manufacturer
- **body_types** (2 columns) - Vehicle body type reference
- **fuel_types** (2 columns) - Fuel type reference  
- **transmissions** (2 columns) - Transmission type reference
- **colours** (2 columns) - Color reference data
- **body_type_mapping** (2 columns) - Body type mapping for imports

### AI & Extraction System (8 tables)
- **api_call_logs** (14 columns) - Unified monitoring for all AI API calls and cost tracking
- **responses_api_configs** (11 columns) - Simplified AI configuration management
- **input_schemas** (6 columns) - Input schema definitions
- **text_format_configs** (7 columns) - Text formatting configurations
- **extraction_sessions** (28 columns) - AI extraction session tracking
- **extraction_listing_changes** (20 columns) - Changes from AI extractions
- **processing_jobs** (22 columns) - Background job processing
- **batch_imports** (16 columns) - Legacy batch import operations (Phase 3C candidate)
- **batch_import_items** (13 columns) - Legacy batch import items (Phase 3C candidate)

### Dealer Configuration (1 table)
- **dealers** (7 columns) - Dealer configuration and settings

### Views (2 views)
- **full_listing_view** - Complete denormalized listing data with lease scores (PRIMARY DATA SOURCE)
- **extraction_session_summary** - Extraction session summary statistics

### Database Functions (15 functions)
1. **apply_extraction_session_changes** - Apply extraction session changes
2. **apply_selected_extraction_changes** - Apply selected extraction changes
3. **check_inference_rate_alert** - Monitor inference rate alerts
4. **config_exists** - Check if configuration exists
5. **create_responses_config** - Create new responses configuration
6. **detect_extraction_deletions** - Detect deletions in extractions
7. **get_current_month_ai_spending** - Get current month AI spending
8. **get_dealer_existing_listings** - Get dealer's existing listings
9. **get_extraction_reference_data** - Get extraction reference data
10. **get_responses_api_config** - Get responses API configuration
11. **is_admin** - Check admin permissions
12. **log_api_call** - Log API calls for monitoring
13. **mark_lease_score_stale** - Mark lease scores as needing recalculation
14. **set_config_active** - Set configuration as active
15. **update_updated_at_column** - Update timestamp trigger

## Database Cleanup & Simplification History (July 2025) ✅ COMPLETED

### Phase 1 COMPLETED
- Removed 3 unused integration tables (`integration_run_logs`, `integration_runs`, `integrations`)

### Phase 2 COMPLETED
- Removed 4 legacy tables (`listing_offers`, `price_change_log`, `listing_changes`, `import_logs`)

### Simplification Phase 1
- Removed 2 legacy AI tables (`prompts`, `prompt_versions`)

### Simplification Phase 2
- Removed 3 analytics objects:
  - `migration_metrics` table
  - `variant_source_distribution` view
  - `dealer_migration_metrics` view

### Simplification Phase 3A+3B
- Removed 5 additional objects:
  - `sellers_with_make` view
  - `monthly_ai_usage` view
  - `dealer_configs` table
  - `ai_usage_log` table
  - `config_versions` table

### Results
- **Edge Functions Updated**: All functions updated to use simplified architecture
- **Code Updates**: `costTracker.ts` updated to use `api_call_logs`, version management simplified
- **Total Result**: ~45-50% database complexity reduction with zero functional impact
- **Unified Monitoring**: All AI monitoring now consolidated in `api_call_logs` table
- **Documentation**: See `docs/DATABASE_CLEANUP_COMPREHENSIVE_PLAN.md` for complete analysis
- **Final State**: 20 tables + 2 views + 15 functions (down from original ~30+ tables + 6+ views)
- **Phase 3C Candidate**: Batch import system can be removed in favor of extraction-based workflow

## Query Patterns

### Performance Queries
Use `full_listing_view` with intelligent deduplication:
```sql
SELECT * FROM full_listing_view 
WHERE make = 'Toyota' 
ORDER BY created_at DESC 
LIMIT 20;
```

### Admin Operations
Use direct table access with proper filtering:
```sql
-- Direct listing updates bypass view
UPDATE listings 
SET monthly_price = 15000 
WHERE listing_id = 'uuid-here';
```

### AI Services
Use specialized views for extraction workflows:
```sql
-- Get extraction session summary
SELECT * FROM extraction_session_summary 
WHERE session_id = 'uuid-here';
```

## Security Architecture

### Row Level Security (RLS)
- **Advanced RLS** with multi-role policies
- **admin** role: Full access to all data and operations
- **service_role**: Backend service access for Edge Functions
- **authenticated**: Limited read access for public features

### RLS Policy Example
```sql
-- Example: Listings table RLS
CREATE POLICY "Public read access" ON listings
  FOR SELECT TO authenticated
  USING (status = 'active');

CREATE POLICY "Admin full access" ON listings
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');
```

## Key Tables Detail

### listings Table (Primary)
Key columns:
- `listing_id` (UUID, PK)
- `seller_id` (FK to sellers)
- `make`, `model`, `variant`
- `monthly_price`, `retail_price`
- `lease_score`, `lease_score_calculated_at`, `lease_score_breakdown`
- `status` (active/inactive/sold)
- Timestamps and metadata

### lease_pricing Table
Multiple pricing offers per listing:
- `id` (UUID, PK)
- `listing_id` (FK to listings)
- `monthly_price`
- `period_months`
- `mileage_per_year`
- `offer_type`

### extraction_sessions Table
AI extraction tracking:
- `id` (UUID, PK)
- `seller_id` (FK to sellers)
- `status` (processing/completed/failed/pending_review)
- `ai_provider`, `ai_model`
- `total_cost`
- Statistics: created_count, updated_count, deleted_count
- Timestamps and metadata

## Migration Management

### Recent Critical Migrations
1. **Lease Score Addition** (July 2025)
   - Added lease_score fields to listings
   - Updated full_listing_view

2. **Extraction Column Fixes** (July 2025)
   - Fixed `engine_info` → `engine_size_cm3`
   - Fixed `duration_months` → `period_months`
   - Removed ambiguous column references

3. **RLS Simplification** (January 2025)
   - Streamlined policies for Edge Function access
   - Added service_role bypass capabilities

## Performance Considerations

### Indexes
- Primary keys on all tables
- Foreign key indexes for relationships
- Composite indexes on frequently queried columns
- Full-text search indexes on text fields

### View Optimization
- `full_listing_view` uses materialized joins
- Automatic refresh on data changes
- Optimized for read-heavy workloads

## Backup and Recovery

### Automatic Backups
- Daily automated backups via Supabase
- Point-in-time recovery available
- 30-day retention period

### Manual Backup Commands
```bash
# Export full database
pg_dump -h [host] -U [user] -d [database] > backup.sql

# Export specific tables
pg_dump -h [host] -U [user] -d [database] -t listings -t lease_pricing > listings_backup.sql
```