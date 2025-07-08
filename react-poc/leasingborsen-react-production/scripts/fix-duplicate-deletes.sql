-- Fix for duplicate delete records created by the detect_extraction_deletions function

-- First, let's see what duplicates exist
WITH duplicate_deletes AS (
  SELECT 
    session_id,
    existing_listing_id,
    COUNT(*) as duplicate_count,
    MIN(id) as keep_id,
    ARRAY_AGG(id ORDER BY created_at) as all_ids
  FROM extraction_listing_changes
  WHERE session_id = '01ed5ac1-d5cf-40de-8521-4aa23f915f5d'
    AND change_type = 'delete'
    AND existing_listing_id IS NOT NULL
  GROUP BY session_id, existing_listing_id
  HAVING COUNT(*) > 1
)
SELECT 
  session_id,
  existing_listing_id,
  duplicate_count,
  keep_id,
  all_ids
FROM duplicate_deletes;

-- Remove duplicate delete records, keeping only the first one
DELETE FROM extraction_listing_changes
WHERE id IN (
  SELECT unnest(array_remove(all_ids, keep_id))
  FROM (
    SELECT 
      existing_listing_id,
      MIN(id) as keep_id,
      ARRAY_AGG(id ORDER BY created_at) as all_ids
    FROM extraction_listing_changes
    WHERE session_id = '01ed5ac1-d5cf-40de-8521-4aa23f915f5d'
      AND change_type = 'delete'
      AND existing_listing_id IS NOT NULL
    GROUP BY existing_listing_id
    HAVING COUNT(*) > 1
  ) duplicates
);

-- Verify the cleanup
SELECT 
  'After Cleanup' as status,
  COUNT(*) as total_deletes,
  COUNT(DISTINCT existing_listing_id) as unique_listings
FROM extraction_listing_changes
WHERE session_id = '01ed5ac1-d5cf-40de-8521-4aa23f915f5d'
  AND change_type = 'delete';

-- Update the extraction session totals to reflect the correct counts
UPDATE extraction_sessions
SET total_deleted = (
  SELECT COUNT(DISTINCT existing_listing_id)
  FROM extraction_listing_changes
  WHERE session_id = '01ed5ac1-d5cf-40de-8521-4aa23f915f5d'
    AND change_type = 'delete'
)
WHERE id = '01ed5ac1-d5cf-40de-8521-4aa23f915f5d';

-- Final verification - should show 7 delete records
SELECT 
  id,
  existing_listing_id,
  extracted_data->>'make' as make,
  extracted_data->>'model' as model,
  extracted_data->>'variant' as variant
FROM extraction_listing_changes
WHERE session_id = '01ed5ac1-d5cf-40de-8521-4aa23f915f5d'
  AND change_type = 'delete'
ORDER BY extracted_data->>'variant';