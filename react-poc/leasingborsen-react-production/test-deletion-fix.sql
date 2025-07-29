-- Test script to verify the deletion fix would resolve the issue
-- This script simulates what would happen after applying the migration

-- 1. First, let's see the current state of the failed extraction
SELECT 
  'BEFORE FIX - Session Status' as test_step,
  id, 
  status, 
  total_extracted,
  applied_at
FROM extraction_sessions 
WHERE id = '80a614f6-1917-4349-8b12-9e93f9b0f3d4';

-- 2. Count deletion changes that are marked as applied but listings still exist
WITH deletion_changes AS (
  SELECT existing_listing_id
  FROM extraction_listing_changes 
  WHERE session_id = '80a614f6-1917-4349-8b12-9e93f9b0f3d4' 
    AND change_type = 'delete'
    AND change_status = 'applied'
)
SELECT 
  'BEFORE FIX - Failed Deletions' as test_step,
  COUNT(*) as marked_as_applied,
  COUNT(l.id) as still_exist,
  COUNT(*) - COUNT(l.id) as actually_deleted
FROM deletion_changes dc
LEFT JOIN listings l ON l.id = dc.existing_listing_id;

-- 3. After applying the migration, we would expect:
-- - The mark_lease_score_stale function to handle DELETE operations properly
-- - The apply_selected_extraction_changes function to verify deletions with ROW_COUNT
-- - All deletions to either succeed or report proper errors

-- Let's verify what the trigger issue was by checking lease score fields
WITH problem_listings AS (
  SELECT elc.existing_listing_id
  FROM extraction_listing_changes elc
  JOIN listings l ON l.id = elc.existing_listing_id
  WHERE elc.session_id = '80a614f6-1917-4349-8b12-9e93f9b0f3d4' 
    AND elc.change_type = 'delete'
    AND elc.change_status = 'applied'
  LIMIT 5
)
SELECT 
  'TRIGGER CONFLICT EVIDENCE' as test_step,
  pl.existing_listing_id,
  l.lease_score,
  l.lease_score_calculated_at IS NOT NULL as has_score_timestamp,
  l.retail_price IS NOT NULL as has_retail_price
FROM problem_listings pl
JOIN listings l ON l.id = pl.existing_listing_id;

-- 4. Check lease_pricing records for these listings (this is what the trigger tries to update)
WITH problem_listings AS (
  SELECT elc.existing_listing_id
  FROM extraction_listing_changes elc
  JOIN listings l ON l.id = elc.existing_listing_id
  WHERE elc.session_id = '80a614f6-1917-4349-8b12-9e93f9b0f3d4' 
    AND elc.change_type = 'delete'
    AND elc.change_status = 'applied'
  LIMIT 3
)
SELECT 
  'LEASE PRICING RECORDS' as test_step,
  pl.existing_listing_id,
  COUNT(lp.id) as pricing_count,
  ARRAY_AGG(lp.monthly_price) as monthly_prices
FROM problem_listings pl
LEFT JOIN lease_pricing lp ON lp.listing_id = pl.existing_listing_id
GROUP BY pl.existing_listing_id;

-- 5. Show the exact error pattern that would be fixed
SELECT 
  'EXPECTED BEHAVIOR AFTER FIX' as test_step,
  'The mark_lease_score_stale trigger will handle DELETE operations properly' as trigger_fix,
  'The apply_selected_extraction_changes will verify deletions with GET DIAGNOSTICS' as function_fix,
  'Failed deletions will be properly reported instead of silently failing' as error_handling;