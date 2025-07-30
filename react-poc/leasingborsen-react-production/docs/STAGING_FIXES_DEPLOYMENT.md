# Staging Environment Fixes - Deployment Guide

## Overview
This guide addresses three critical issues in the staging environment:
1. Seller update failure due to missing `updated_at` field/trigger
2. Listing deletion failure due to foreign key constraints
3. Listing duplication failure due to missing `administrative_fee` column

## Deployment Steps

### Step 1: Apply Database Migrations

Apply the following migrations to your staging database through the Supabase Dashboard:

1. **Fix Seller Updated At** (`20250129_fix_seller_updated_at.sql`)
   - Adds/ensures `updated_at` column exists on sellers table
   - Creates proper trigger for automatic timestamp updates
   - Updates any NULL values

2. **Add Administrative Fee Column** (`20250129_add_administrative_fee_column.sql`)
   - Adds `administrative_fee` column to `lease_pricing` table
   - Ensures compatibility with listing duplication feature

### Step 2: Deploy Updated Edge Function

Deploy the updated `admin-listing-operations` Edge Function:

```bash
# From project root
supabase functions deploy admin-listing-operations --project-ref <your-staging-project-ref>
```

This updated function:
- Properly handles deletion of `extraction_listing_changes` references
- Ensures all related records are deleted in the correct order
- Prevents foreign key constraint violations

### Step 3: Recreate full_listing_view (if needed)

After adding the `administrative_fee` column, you may need to recreate the `full_listing_view`:

1. Export the current view definition from production
2. Modify it to include the `administrative_fee` column from `lease_pricing`
3. Apply the updated view definition to staging

### Step 4: Verify Fixes

Test each fix:

1. **Test Seller Updates**:
   - Go to Admin > Sellers
   - Edit any seller and save changes
   - Should save successfully without errors

2. **Test Listing Deletion**:
   - Go to Admin > Listings  
   - Delete a listing (preferably one with extraction history)
   - Should delete successfully without foreign key errors

3. **Test Listing Duplication**:
   - Go to Admin > Listings
   - Use the duplicate action on any listing
   - Should duplicate successfully with all pricing data

## Rollback Plan

If issues persist:

1. The migrations are safe and additive (no data loss)
2. The Edge Function can be rolled back to the previous version
3. No breaking changes to existing functionality

## Notes

- These fixes address schema drift between production and staging
- Consider implementing a CI/CD pipeline to keep environments in sync
- Regular schema comparisons between environments can prevent these issues

## Alternative Quick Fix (If Migrations Can't Be Applied Immediately)

For the deletion issue specifically, you can manually clean up references:

```sql
-- Before deleting a listing, run this in SQL Editor:
DELETE FROM extraction_listing_changes WHERE existing_listing_id = '<listing-id>';
DELETE FROM lease_pricing WHERE listing_id = '<listing-id>';
DELETE FROM listings WHERE id = '<listing-id>';
```