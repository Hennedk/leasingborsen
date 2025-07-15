# Deletion Failure Analysis - Listing e5841862-1d46-4450-9710-6f7c037741ba

## Problem Summary

The deletion is failing because:

1. **The deletion was already attempted and rejected** - The change status is "rejected", not "pending"
2. **Foreign key constraint violation** - The error message shows: "update or delete on table 'listings' violates foreign key constraint 'extraction_listing_changes_existing_listing_id_fkey'"
3. **The apply function only processes "pending" changes** - Since the status is "rejected", it gets skipped

## Root Cause

The `apply_selected_extraction_changes` function has this logic:

```sql
-- First, mark selected changes as 'applied'
UPDATE extraction_listing_changes 
SET 
  change_status = 'applied',
  reviewed_at = NOW(),
  applied_by = p_applied_by
WHERE session_id = p_session_id 
  AND id = ANY(p_selected_change_ids)
  AND change_status = 'pending';  -- Only updates pending changes!
```

Then it processes changes:
```sql
FOR change_record IN 
  SELECT * FROM extraction_listing_changes 
  WHERE session_id = p_session_id 
    AND id = ANY(p_selected_change_ids)
    AND change_status = 'applied'  -- Only processes newly applied changes!
```

Since the deletion change has status = 'rejected', it never gets updated to 'applied' and therefore never gets processed.

## Timeline of Events

1. User selected the deletion for apply
2. Apply function attempted the deletion
3. Deletion failed with foreign key constraint error
4. Change was marked as 'rejected' with the error message
5. User tries to apply again
6. Function skips the change because it's not 'pending'
7. Result: 0 deletions, 39 discarded

## Solutions

### Option 1: Reset and Retry (Recommended)
```sql
-- Reset the change to pending
UPDATE extraction_listing_changes 
SET 
  change_status = 'pending',
  review_notes = null,
  reviewed_at = null,
  applied_by = null
WHERE id = 'bb3496e0-df99-4c5d-b99b-e796a507f1d6';

-- Then retry the apply operation
```

### Option 2: Fix the Apply Function
The apply function should handle retrying rejected changes:
```sql
-- Update the WHERE clause to include rejected changes
AND change_status IN ('pending', 'rejected')
```

### Option 3: Manual Cleanup
1. Delete all other `extraction_listing_changes` references to this listing
2. Delete from `lease_pricing`
3. Delete from `price_change_log` 
4. Delete from `listings`

## Immediate Fix

Run the fix script:
```bash
node scripts/fix-deletion-constraint-issue.js
```

This script will:
1. Show all references to the listing
2. Offer to reset the status and retry
3. Or manually clean up and delete

## Long-term Solution

1. **Improve error handling** - Show clear error messages in the UI when deletions fail
2. **Add retry capability** - Allow retrying failed/rejected changes
3. **Fix the foreign key issue** - The deletion logic in the apply function may need to delete ALL references, not just some

## Current Status

- Deletion change exists but is marked as "rejected"
- Listing still exists in the database
- Has 1 lease_pricing record
- The apply function is working correctly but skipping rejected changes
- User needs to either reset the status or manually clean up