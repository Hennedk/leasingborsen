-- Investigation script for deletion failure in extraction session 80a614f6-1917-4349-8b12-9e93f9b0f3d4
-- This script will help identify why deletions were marked as applied but listings still exist

-- 1. Get extraction session details
SELECT 
  id, 
  session_name, 
  seller_id, 
  status, 
  total_extracted, 
  applied_at,
  created_at
FROM extraction_sessions 
WHERE id = '80a614f6-1917-4349-8b12-9e93f9b0f3d4';

-- 2. Get all deletion changes for this session
SELECT 
  id as change_id,
  change_type,
  change_status,
  existing_listing_id,
  applied_by,
  reviewed_at,
  extracted_data
FROM extraction_listing_changes 
WHERE session_id = '80a614f6-1917-4349-8b12-9e93f9b0f3d4' 
  AND change_type = 'delete';

-- 3. Check if listings marked for deletion still exist
WITH deletion_changes AS (
  SELECT 
    id as change_id,
    existing_listing_id,
    change_status,
    extracted_data
  FROM extraction_listing_changes 
  WHERE session_id = '80a614f6-1917-4349-8b12-9e93f9b0f3d4' 
    AND change_type = 'delete'
    AND change_status = 'applied'
)
SELECT 
  dc.change_id,
  dc.existing_listing_id,
  dc.change_status,
  CASE 
    WHEN l.id IS NOT NULL THEN 'STILL EXISTS' 
    ELSE 'DELETED' 
  END as actual_status,
  l.make,
  l.model,
  l.variant,
  dc.extracted_data
FROM deletion_changes dc
LEFT JOIN listings l ON l.id = dc.existing_listing_id
ORDER BY actual_status DESC, dc.change_id;

-- 4. Check for any lease_pricing records that might be blocking deletion
WITH deletion_changes AS (
  SELECT existing_listing_id
  FROM extraction_listing_changes 
  WHERE session_id = '80a614f6-1917-4349-8b12-9e93f9b0f3d4' 
    AND change_type = 'delete'
    AND change_status = 'applied'
)
SELECT 
  dc.existing_listing_id,
  COUNT(lp.id) as pricing_records_count,
  ARRAY_AGG(lp.id) as pricing_ids
FROM deletion_changes dc
LEFT JOIN lease_pricing lp ON lp.listing_id = dc.existing_listing_id
GROUP BY dc.existing_listing_id;

-- 5. Check for any other references that might prevent deletion
WITH deletion_changes AS (
  SELECT existing_listing_id
  FROM extraction_listing_changes 
  WHERE session_id = '80a614f6-1917-4349-8b12-9e93f9b0f3d4' 
    AND change_type = 'delete'
    AND change_status = 'applied'
)
SELECT 
  'extraction_listing_changes' as table_name,
  dc.existing_listing_id,
  COUNT(*) as reference_count
FROM deletion_changes dc
LEFT JOIN extraction_listing_changes elc ON elc.existing_listing_id = dc.existing_listing_id
GROUP BY dc.existing_listing_id
HAVING COUNT(*) > 0

UNION ALL

SELECT 
  'lease_pricing' as table_name,
  dc.existing_listing_id,
  COUNT(*) as reference_count
FROM deletion_changes dc
LEFT JOIN lease_pricing lp ON lp.listing_id = dc.existing_listing_id
GROUP BY dc.existing_listing_id
HAVING COUNT(*) > 0;

-- 6. Test if we can manually delete one of the failed listings to identify the constraint issue
-- Note: This is just a SELECT to see what would be affected, not an actual DELETE
WITH test_deletion AS (
  SELECT existing_listing_id
  FROM extraction_listing_changes 
  WHERE session_id = '80a614f6-1917-4349-8b12-9e93f9b0f3d4' 
    AND change_type = 'delete'
    AND change_status = 'applied'
  LIMIT 1
)
SELECT 
  'Would delete listing:' as action,
  l.id,
  l.make,
  l.model,
  l.variant,
  l.lease_score,
  l.lease_score_calculated_at
FROM test_deletion td
JOIN listings l ON l.id = td.existing_listing_id;