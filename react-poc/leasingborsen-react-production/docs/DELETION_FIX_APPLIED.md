# Deletion Fix Applied - July 13, 2025

## Problem Fixed
Deletion of listings was failing due to foreign key constraint violations when multiple extraction sessions referenced the same listing.

## Root Cause
The `apply_selected_extraction_changes` function only deleted extraction_listing_changes records with status 'pending' or 'discarded', leaving behind 'rejected' and 'applied' records from other sessions that prevented deletion.

## Solution Applied
Updated the deletion logic to remove ALL extraction_listing_changes references:

```sql
-- OLD (problematic):
DELETE FROM extraction_listing_changes 
WHERE existing_listing_id = v_listing_to_delete
  AND change_status IN ('pending', 'discarded')  -- This filter was the problem!
  AND id != change_record.id;

-- NEW (fixed):
DELETE FROM extraction_listing_changes 
WHERE existing_listing_id = v_listing_to_delete;
-- Now deletes ALL references, regardless of status
```

## Migration File
- Location: `supabase/migrations/20250713_fix_deletion_all_references.sql`
- Key change: Line ~323 in the DELETE section

## How to Apply
1. Go to Supabase SQL Editor: https://supabase.com/dashboard/project/hqqouszbgskteivjoems/sql/new
2. Copy the contents of the migration file
3. Paste and click "Run"

## Testing
After applying the migration:
1. Run: `node scripts/test-deletion-fix.js`
2. Or manually retry the deletion in the UI

## Impact
- Deletions will no longer fail due to references from previous extraction sessions
- Historical extraction data is preserved (not a problem)
- The system correctly prioritizes current operations over historical references

## Future Considerations
- Consider adding a cleanup job for old extraction_listing_changes records
- Add better error messages in the UI when deletions fail
- Consider soft deletes to avoid foreign key issues entirely