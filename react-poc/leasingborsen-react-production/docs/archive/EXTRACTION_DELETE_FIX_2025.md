# Extraction DELETE Operation Fix - January 2025

## Executive Summary

This document details the critical fixes applied to resolve persistent DELETE operation failures in the extraction changes system. The issues were causing foreign key constraint violations and preventing proper cleanup of outdated listings.

## Issues Identified

### 1. Ambiguous Column Reference Error

**Error Message**:
```
column reference 'existing_listing_id' is ambiguous
```

**Root Cause**: In the PL/pgSQL function `apply_selected_extraction_changes`, a variable was named identically to a column, causing PostgreSQL to be unable to distinguish between them in the DELETE section.

### 2. Foreign Key Constraint Violations

**Error Message**:
```
update or delete on table "listings" violates foreign key constraint "extraction_listing_changes_existing_listing_id_fkey" on table "extraction_listing_changes"
```

**Root Cause**: Multiple `extraction_listing_changes` records could reference the same listing. The original logic only cleared references for the current changes being processed, leaving other references intact and preventing deletion.

### 3. Toyota bZ4X Duplicate Creation

**Issue**: Vehicles with identical make/model/variant but different transmissions were being treated as separate entities, creating duplicates.

**Root Cause**: The exact matching key included transmission, causing manual and automatic versions of the same car to not match.

## Solutions Implemented

### 1. Variable Naming Fix

**File**: Database function `apply_selected_extraction_changes`

**Before**:
```sql
DECLARE
    existing_listing_id UUID;
    -- ... other variables
BEGIN
    -- ... code using existing_listing_id
    
    -- DELETE section - ambiguous reference
    UPDATE extraction_listing_changes 
    SET existing_listing_id = NULL
    WHERE existing_listing_id = existing_listing_id -- Which one?
      AND id != ANY(p_selected_change_ids);
```

**After**:
```sql
DECLARE
    v_existing_listing_id UUID;  -- Renamed with v_ prefix
    -- ... other variables
BEGIN
    -- ... code using v_existing_listing_id
    
    -- DELETE section - no ambiguity
    UPDATE extraction_listing_changes 
    SET existing_listing_id = NULL
    WHERE existing_listing_id = v_existing_listing_id;  -- Clear reference
```

### 2. Foreign Key Reference Cleanup

**Original Logic** (Incorrect):
```sql
-- Only cleared references for OTHER changes, not the current one
UPDATE extraction_listing_changes 
SET existing_listing_id = NULL
WHERE existing_listing_id = v_existing_listing_id 
  AND id != ANY(p_selected_change_ids);  -- This exclusion was wrong
```

**Fixed Logic**:
```sql
-- Clear ALL references to the listing being deleted
UPDATE extraction_listing_changes 
SET existing_listing_id = NULL
WHERE existing_listing_id = v_existing_listing_id;
-- No exclusion - clears all references including from other sessions
```

This ensures that:
1. All foreign key references are cleared before deletion
2. References from other sessions don't block deletion
3. The listing can be safely deleted without constraint violations

### 3. Matching Logic Update

**File**: `supabase/functions/compare-extracted-listings/index.ts`

**Before**:
```typescript
export function generateExactKey(
  make: string, 
  model: string, 
  variant: string, 
  transmission: string
): string {
  return `${make}|${model}|${variant}|${transmission}`.toLowerCase();
}
```

**After**:
```typescript
export function generateExactKey(
  make: string, 
  model: string, 
  variant: string
): string {
  return `${make}|${model}|${variant}`.toLowerCase();
}
```

**Impact**: Vehicles with same make/model/variant now match regardless of transmission, preventing duplicates.

## Validation and Testing

### Successfully Deleted Listings

1. **Listing**: `22bf5261-322a-47c7-afe0-4e3872841f4b`
   - **Session**: `290915a6-0fc9-4da7-b1c6-1ebd3c86becf`
   - **Issue**: Had multiple extraction_listing_changes references
   - **Result**: Successfully deleted after fix

2. **Listing**: `dd943a4d-7e93-49dc-b351-59d924218304`
   - **Environment**: Staging
   - **Result**: Deletion completed without errors

### Test Scenarios Validated

1. **Multiple References Test**
   - Create listing with references from multiple sessions
   - Attempt DELETE operation
   - Verify all references cleared and listing deleted

2. **Cascade Deletion Test**
   - Create listing with lease_pricing records
   - Execute DELETE
   - Verify proper deletion order

3. **Toyota Matching Test**
   - Extract Toyota with "Automatik" in variant
   - Verify matches existing manual version
   - Confirm no duplicate created

## Important Behavioral Changes

### ⚠️ Critical Change: Model-Agnostic Deletion

The updated logic no longer restricts deletions by model. This means:

**Before**: Only unmatched listings of extracted models were marked for deletion
**After**: ALL unmatched listings from the dealer are marked for deletion

**Impact**: 
- Uploading a partial inventory (e.g., only VW models) will mark ALL non-VW listings for deletion
- Users must carefully review extraction results before applying changes
- Consider implementing dealer-specific or model-specific extraction sessions

## Implementation Checklist

- [x] Fix variable naming in `apply_selected_extraction_changes`
- [x] Update DELETE logic to clear all references
- [x] Remove transmission from exact key generation
- [x] Update frontend matching logic to mirror backend
- [x] Test DELETE operations in staging
- [x] Verify Toyota bZ4X no longer creates duplicates
- [x] Document behavioral changes

## Migration Notes

No database migration required. The fixes are in:
1. Database function logic (via SQL editor)
2. Edge Function code (via Supabase dashboard)

## Monitoring and Validation

After deployment, monitor for:
1. Successful DELETE operations in extraction workflow
2. No foreign key constraint violations
3. Reduced duplicate listings for Toyota and similar brands
4. User feedback on deletion behavior

## Future Considerations

1. **Scoped Deletions**: Implement option to restrict deletions by:
   - Specific models
   - Date ranges
   - Seller categories

2. **Soft Deletes**: Consider implementing soft delete with restoration capability

3. **Deletion Preview**: Enhanced UI to show deletion impact before applying

## Related Files

- `supabase/functions/apply-extraction-changes/index.ts` - Edge Function
- `supabase/functions/compare-extracted-listings/index.ts` - Comparison logic
- `src/services/comparison/comparison-utils.ts` - Frontend utilities
- `src/hooks/useListingComparison.ts` - React hook for UI

## Support

For issues or questions about these changes:
1. Check extraction session logs in Supabase dashboard
2. Review `api_call_logs` for Edge Function errors
3. Test in staging environment first