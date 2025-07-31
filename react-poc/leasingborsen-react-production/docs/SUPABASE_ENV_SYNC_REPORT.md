# Supabase Environment Sync Report

**Generated**: January 29, 2025  
**Staging**: lpbtgtpgbnybjqcpsrrf  
**Production**: hqqouszbgskteivjoems

## Executive Summary

The staging and production Supabase environments have significant differences that need to be addressed:

- **Critical**: Production is missing multiple columns in `lease_pricing` table
- **Important**: Production missing `updated_at` column in `sellers` table
- **Functions**: Production has 9 additional functions not in staging
- **Triggers**: Different trigger configurations between environments
- **RLS**: Production has RLS policies, staging doesn't

## 📊 Detailed Comparison Results

### 1. Tables (✅ ALIGNED)
Both environments have the same 20 tables:
- api_call_logs
- batch_import_items
- batch_imports
- body_type_mapping
- body_types
- colours
- dealers
- extraction_listing_changes
- extraction_sessions
- fuel_types
- input_schemas
- lease_pricing
- listings
- makes
- models
- processing_jobs
- responses_api_configs
- sellers
- text_format_configs
- transmissions

### 2. Column Differences (❌ NOT ALIGNED)

#### `lease_pricing` Table
**Production Missing Columns** (7 columns):
- `administrative_fee` (numeric)
- `ownership_fee` (numeric)
- `overage_fee_per_km` (numeric)
- `large_maintenance_included` (boolean)
- `small_maintenance_included` (boolean)
- `replacement_car_included` (boolean)
- `insurance_included` (boolean)
- `tire_included` (boolean)

**Column Order Difference**: `is_primary` column position differs

#### `sellers` Table
**Production Missing Columns** (1 column):
- `updated_at` (timestamp with time zone)

### 3. Views (✅ ALIGNED)
Both environments have the same 2 views:
- `extraction_session_summary`
- `full_listing_view`

**Note**: The `full_listing_view` in production may not include the missing `lease_pricing` columns.

### 4. Functions (❌ NOT ALIGNED)

**Staging Functions** (6 total):
- apply_selected_extraction_changes
- get_dealer_existing_listings
- get_extraction_reference_data
- get_responses_api_config
- log_api_call
- update_updated_at_column

**Production Functions** (15 total):
All staging functions PLUS:
- apply_extraction_session_changes
- check_inference_rate_alert
- config_exists
- create_responses_config
- detect_extraction_deletions
- get_current_month_ai_spending
- is_admin
- mark_lease_score_stale
- set_config_active

### 5. Triggers (❌ NOT ALIGNED)

**Staging Triggers** (3 total):
- update_lease_pricing_updated_at (on lease_pricing)
- update_listings_updated_at (on listings)
- update_sellers_updated_at (on sellers) ← NEW

**Production Triggers** (6 total):
- update_lease_pricing_updated_at (on lease_pricing)
- update_listings_updated_at (on listings)
- listings_score_stale (on listings)
- pricing_score_stale (on lease_pricing) × 3 duplicates
- **MISSING**: update_sellers_updated_at

### 6. RLS Policies (❌ NOT ALIGNED)

**Staging**: No RLS policies found on `listings` table

**Production**: 3 RLS policies on `listings` table:
- "Admin full access to listings" (ALL)
- "Anonymous can view listings" (SELECT)
- "Service role full access to listings" (ALL)

## 🚨 Critical Issues

### 1. Data Integrity Risk
The missing columns in production `lease_pricing` could cause:
- Frontend errors when duplicating listings
- API failures when creating/updating lease pricing
- Missing important pricing metadata

### 2. Application Functionality
Missing `sellers.updated_at` in production will:
- Cause seller update operations to fail
- Prevent proper audit trail tracking

### 3. Security Concern
Staging lacks RLS policies, meaning:
- No row-level security enforcement
- Potential data exposure if used incorrectly

## 📋 Required Actions

### Immediate Actions for Production

1. **Apply Missing Migrations**:
   ```sql
   -- 1. Add lease_pricing columns
   ALTER TABLE lease_pricing 
   ADD COLUMN IF NOT EXISTS administrative_fee DECIMAL(10, 2),
   ADD COLUMN IF NOT EXISTS ownership_fee DECIMAL(10, 2),
   ADD COLUMN IF NOT EXISTS overage_fee_per_km DECIMAL(10, 2),
   ADD COLUMN IF NOT EXISTS large_maintenance_included BOOLEAN DEFAULT false,
   ADD COLUMN IF NOT EXISTS small_maintenance_included BOOLEAN DEFAULT false,
   ADD COLUMN IF NOT EXISTS replacement_car_included BOOLEAN DEFAULT false,
   ADD COLUMN IF NOT EXISTS insurance_included BOOLEAN DEFAULT false,
   ADD COLUMN IF NOT EXISTS tire_included BOOLEAN DEFAULT false;

   -- 2. Add sellers.updated_at
   ALTER TABLE sellers 
   ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

   -- 3. Add sellers trigger
   CREATE TRIGGER update_sellers_updated_at
     BEFORE UPDATE ON sellers
     FOR EACH ROW
     EXECUTE FUNCTION update_updated_at_column();
   ```

2. **Update full_listing_view** to include new columns

3. **Deploy Latest Edge Functions** to ensure compatibility

### Actions for Staging

1. **Copy Missing Functions** from production:
   - All AI/extraction related functions
   - Lease score functions
   - Admin utility functions

2. **Enable RLS Policies** to match production security

3. **Fix Duplicate Triggers** in production (pricing_score_stale × 3)

## 🔄 Sync Strategy

### Short Term (This Week)
1. Apply all missing migrations to production
2. Deploy updated Edge Functions to both environments
3. Verify application functionality in both environments

### Long Term (This Month)
1. Implement automated schema comparison in CI/CD
2. Create a single source of truth for migrations
3. Document deployment procedures in SOLO_DEVELOPER_WORKFLOW.md
4. Set up monitoring for schema drift

## 📊 Environment Health Score

**Staging**: 7/10
- ✅ Has latest column fixes
- ✅ Updated Edge Functions
- ❌ Missing production functions
- ❌ No RLS policies

**Production**: 5/10
- ✅ Has RLS policies
- ✅ Has all functions
- ❌ Missing critical columns
- ❌ Schema drift from staging

## 🛠️ Maintenance Recommendations

1. **Weekly Schema Checks**: Run comparison script weekly
2. **Migration Discipline**: Always apply to both environments
3. **Documentation**: Update this report after each deployment
4. **Automation**: Consider GitHub Actions for schema sync
5. **Testing**: Test migrations in staging before production

## Appendix: Quick Commands

### Check Schema Differences
```bash
# Run from project root
node scripts/compare-supabase-environments.js
```

### Apply Migrations
```bash
# Staging
supabase db push --project-ref lpbtgtpgbnybjqcpsrrf

# Production (careful!)
supabase db push --project-ref hqqouszbgskteivjoems
```

### Deploy Edge Functions
```bash
# Deploy all functions to staging
supabase functions deploy --project-ref lpbtgtpgbnybjqcpsrrf

# Deploy all functions to production
supabase functions deploy --project-ref hqqouszbgskteivjoems
```

---

**Next Review Date**: February 5, 2025  
**Report Version**: 1.0