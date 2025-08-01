-- Debug extraction session 64ad98ac-06fc-40ad-9cef-6c0aeb6323b7
-- Check why UPDATE changes are not being processed

-- 1. Check session status
SELECT 
  'Session status:' as info,
  id,
  status,
  total_extracted,
  total_updated,
  total_deleted,
  applied_at
FROM extraction_sessions 
WHERE id = '64ad98ac-06fc-40ad-9cef-6c0aeb6323b7';

-- 2. Check extraction changes status
SELECT 
  'Changes by type and status:' as info,
  change_type,
  change_status,
  COUNT(*) as count
FROM extraction_listing_changes 
WHERE session_id = '64ad98ac-06fc-40ad-9cef-6c0aeb6323b7'
GROUP BY change_type, change_status
ORDER BY change_type, change_status;

-- 3. Check specific details of the 14 UPDATE changes
SELECT 
  'UPDATE changes details:' as info,
  id,
  existing_listing_id,
  change_status,
  extracted_data ? 'offers' as has_offers,
  jsonb_array_length(COALESCE(extracted_data->'offers', '[]'::jsonb)) as offers_count,
  extracted_data ? 'variant' as has_variant,
  extracted_data ? 'horsepower' as has_horsepower
FROM extraction_listing_changes 
WHERE session_id = '64ad98ac-06fc-40ad-9cef-6c0aeb6323b7'
  AND change_type = 'update'
ORDER BY id
LIMIT 5; -- Show first 5 to check data structure

-- 4. Check if existing listings exist for these UPDATE changes
SELECT 
  'Existing listings check:' as info,
  elc.id as change_id,
  elc.existing_listing_id,
  CASE WHEN l.id IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as listing_exists
FROM extraction_listing_changes elc
LEFT JOIN listings l ON l.id = elc.existing_listing_id
WHERE elc.session_id = '64ad98ac-06fc-40ad-9cef-6c0aeb6323b7'
  AND elc.change_type = 'update'
LIMIT 5;

-- 5. Test with a single UPDATE change to see what happens
-- Get the first UPDATE change ID
WITH first_update AS (
  SELECT id 
  FROM extraction_listing_changes 
  WHERE session_id = '64ad98ac-06fc-40ad-9cef-6c0aeb6323b7'
    AND change_type = 'update'
    AND change_status = 'pending'
  LIMIT 1
)
SELECT 
  'Testing single UPDATE:' as info,
  apply_selected_extraction_changes(
    '64ad98ac-06fc-40ad-9cef-6c0aeb6323b7'::UUID,
    ARRAY[id],
    'debug-test'
  ) as result
FROM first_update;