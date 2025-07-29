# Deployment Instructions for Deletion Fix

## Issue Summary
Extraction session `80a614f6-1917-4349-8b12-9e93f9b0f3d4` had deletion operations marked as "applied" but the listings still exist in the database. Root cause identified as lease score trigger conflicts during deletion operations.

## Root Cause
The `mark_lease_score_stale()` trigger function was trying to UPDATE listings during DELETE operations on the `lease_pricing` table, causing silent failures where deletions appeared successful but were actually blocked.

## Fix Components

### 1. Enhanced Trigger Function
The migration updates `mark_lease_score_stale()` to:
- Properly handle DELETE operations without trying to UPDATE during deletion
- Use `TG_OP = 'DELETE'` to detect deletion operations
- Return `OLD` for DELETE operations (required by PostgreSQL)
- Only update associated listings if they still exist

### 2. Enhanced Deletion Function
The migration updates `apply_selected_extraction_changes()` to:
- Use `GET DIAGNOSTICS v_deletion_count = ROW_COUNT` to verify actual deletions
- Raise exceptions when deletions fail (no more silent failures)
- Include deletion count in error reporting for better debugging

### 3. Updated Trigger Definition
The trigger now includes DELETE operations:
```sql
CREATE TRIGGER pricing_score_stale
AFTER INSERT OR UPDATE OF monthly_price, period_months, mileage_per_year OR DELETE
ON lease_pricing
FOR EACH ROW
EXECUTE FUNCTION mark_lease_score_stale();
```

## Deployment Steps

### Step 1: Apply Migration via Supabase Dashboard
1. Open Supabase Dashboard → SQL Editor
2. Run the migration file: `supabase/migrations/20250725_fix_deletion_lease_score_trigger_conflict.sql`
3. Verify no errors in execution

### Step 2: Test the Fix
1. Run `test-deletion-fix.sql` to verify current state
2. Test with a small subset of the failed extraction changes
3. Verify deletions now work properly or report clear errors

### Step 3: Clean Up Failed Session
After confirming the fix works:
1. Re-run the failed extraction session changes
2. Clean up any remaining orphaned data
3. Update session status to properly reflect completion

## Expected Outcome
- Deletion operations will either succeed completely or fail with clear error messages
- No more silent failures where deletions are marked as applied but listings remain
- Proper trigger behavior during deletion operations
- Enhanced error reporting for debugging future issues

## Verification Queries
```sql
-- Check if any deletions are still failing silently
SELECT COUNT(*) as failed_deletions
FROM extraction_listing_changes elc
JOIN listings l ON l.id = elc.existing_listing_id
WHERE elc.change_status = 'applied' 
  AND elc.change_type = 'delete';

-- Should return 0 after fix is applied and session is re-processed
```

## Rollback Plan
If issues occur, the previous versions of both functions are available in:
- `supabase/migrations/20250723_fix_incomplete_update_fields.sql` (apply_selected_extraction_changes)
- `supabase/migrations/20250107_add_lease_score_triggers.sql` (mark_lease_score_stale)