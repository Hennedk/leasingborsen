# Staging Environment Schema Fixes - Summary

## Issues Fixed (January 29, 2025)

### 1. ✅ Seller Update Issue
**Error**: `'record "new" has no field "updated_at"'`
**Solution**: Added `updated_at` column and trigger to sellers table
**Status**: FIXED

### 2. ✅ Listing Deletion Issue  
**Error**: Foreign key constraint violation with `extraction_listing_changes`
**Solution**: Updated Edge Function to handle cascading deletes properly
**Status**: FIXED

### 3. ✅ Listing Duplication Issue
**Error**: Missing columns in `lease_pricing` table
**Solution**: Added all missing columns to match production schema
**Status**: FIXED

## Columns Added to lease_pricing Table

The following columns were added to resolve the duplication issue:
- `administrative_fee` (DECIMAL 10,2)
- `ownership_fee` (DECIMAL 10,2)
- `overage_fee_per_km` (DECIMAL 10,2)
- `large_maintenance_included` (BOOLEAN, default: false)
- `small_maintenance_included` (BOOLEAN, default: false)
- `replacement_car_included` (BOOLEAN, default: false)
- `insurance_included` (BOOLEAN, default: false)
- `tire_included` (BOOLEAN, default: false)

## Deployments Completed

1. **Database Migrations Applied**:
   - `20250129_fix_seller_updated_at.sql`
   - `20250129_add_administrative_fee_column.sql`
   - `20250129_add_missing_lease_pricing_columns.sql`

2. **Edge Function Updated**:
   - `admin-listing-operations` - Now handles foreign key constraints properly

## Testing Checklist

- [ ] **Seller Updates**: Edit a seller in Admin > Sellers
- [ ] **Listing Deletion**: Delete a listing in Admin > Listings  
- [ ] **Listing Duplication**: Duplicate a listing in Admin > Listings

## Root Cause

The staging database schema had drifted from production, missing several columns and triggers that were added to production over time. This is a common issue when migrations are not consistently applied across environments.

## Prevention

To prevent future schema drift:
1. Always apply migrations to all environments (local, staging, production)
2. Use CI/CD pipelines to automate migration deployment
3. Regularly compare schemas between environments
4. Document all schema changes in migration files

## Production Deployment

These same migrations should be reviewed against production to ensure schema consistency. Some may already exist in production, use `IF NOT EXISTS` clauses to make migrations idempotent.