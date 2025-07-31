# Staging Environment Baseline Documentation

**Date**: January 31, 2025  
**Author**: System Documentation  
**Purpose**: Document the baseline state of the newly created staging environment

## Environment Details

- **Project ID**: lpbtgtpgbnybjqcpsrrf
- **Project Name**: leasingborsen-staging
- **Created**: January 29, 2025
- **Region**: eu-north-1
- **PostgreSQL Version**: 17.4.1.066 (newer than production's 15.8.1.085)

## Migration Count Explanation

The staging environment shows only 10 migrations compared to production's 66 migrations. This difference is **expected and healthy** because:

1. **Fresh Environment**: Staging was created recently with a consolidated schema
2. **No Legacy Baggage**: Doesn't carry years of incremental migration history
3. **Same End State**: The final schema matches production despite fewer migrations

### Migration History
- **Production**: 66 migrations accumulated over the project lifetime
- **Staging**: 10 migrations represent the consolidated/squashed state
- **Last Staging Migration**: `20250731081723_add_missing_functions_to_staging`

## Current State (January 31, 2025)

### Database Objects ✅
- **Tables**: 20 (matches production)
- **Functions**: 15 (matches production)
- **Views**: 2 (matches production)
  - `full_listing_view`
  - `extraction_session_summary`

### Edge Functions ✅
All 12 Edge Functions successfully deployed:
- ✅ admin-image-operations
- ✅ admin-listing-operations (including latest duplicate operation)
- ✅ admin-reference-operations
- ✅ admin-seller-operations
- ✅ ai-extract-vehicles
- ✅ apply-extraction-changes
- ✅ batch-calculate-lease-scores
- ✅ calculate-lease-score
- ✅ compare-extracted-listings
- ✅ manage-prompts
- ✅ pdf-proxy
- ✅ remove-bg

### Security Warnings (Same as Production)
Both environments show identical security advisories:
- Multiple tables missing RLS policies
- Function search paths not set
- Views using SECURITY DEFINER

These are existing issues present in both environments, not staging-specific problems.

## Synchronization Status

### January 29, 2025 Sync
Per `SUPABASE_SYNC_COMPLETION_REPORT.md`, the following was synchronized:
- Added missing columns to `lease_pricing` table
- Added `updated_at` column to `sellers` table
- Added missing database functions
- Applied RLS policies to match production

### January 31, 2025 Update
- Fixed syntax errors in `remove-bg` Edge Function
- Deployed all Edge Functions to both environments
- Confirmed functional parity between environments

## Advantages of Fresh Staging

1. **Clean Schema**: No accumulated technical debt from old migrations
2. **Modern PostgreSQL**: Version 17 vs production's version 15
3. **Easier Debugging**: Simpler migration history to trace
4. **Performance**: Potentially better performance without legacy constraints

## Maintenance Notes

### Going Forward
1. **Focus on Schema Parity**: Don't worry about migration count differences
2. **Simultaneous Deployment**: Always deploy to both environments
3. **Regular Validation**: Run schema comparisons monthly
4. **Document Changes**: Update this baseline when major changes occur

### Known Differences
- **PostgreSQL Version**: Staging (17) vs Production (15)
- **Migration Count**: Expected difference due to fresh environment
- **Creation Date**: Staging created January 2025

### Edge Function Deployment Note
The `ai-extract-vehicles` function occasionally fails deployment to production with a 403 error. This appears to be related to its size. When this occurs:
1. Try deploying individually with `--debug` flag
2. Check Supabase dashboard for manual upload option
3. Contact support if persistent

## Conclusion

The staging environment is **fully functional and synchronized** with production as of January 31, 2025. The migration count difference is explained by the staging environment being newly created with a consolidated schema, which is a best practice for fresh environments.

Both environments are ready for continued development and deployment workflows as outlined in `SOLO_DEVELOPER_WORKFLOW.md`.