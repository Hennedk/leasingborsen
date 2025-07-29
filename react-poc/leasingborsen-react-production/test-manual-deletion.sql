-- Test manual deletion to identify the constraint issue
-- This will help us understand why the apply_selected_extraction_changes function is failing

-- First, get one listing that should have been deleted
WITH failed_deletion AS (
  SELECT 
    elc.existing_listing_id,
    l.make,
    l.model,
    l.variant
  FROM extraction_listing_changes elc
  JOIN listings l ON l.id = elc.existing_listing_id
  WHERE elc.session_id = '80a614f6-1917-4349-8b12-9e93f9b0f3d4' 
    AND elc.change_type = 'delete'
    AND elc.change_status = 'applied'
  LIMIT 1
)
SELECT 
  'Testing deletion of listing:' as info,
  existing_listing_id,
  make || ' ' || model || ' ' || variant as vehicle
FROM failed_deletion;

-- Now let's try the same deletion steps as the function, but with better error reporting

-- Step 1: Try to delete extraction_listing_changes references
BEGIN;

-- Get a test listing ID
WITH test_listing AS (
  SELECT 
    elc.existing_listing_id as listing_id
  FROM extraction_listing_changes elc
  JOIN listings l ON l.id = elc.existing_listing_id
  WHERE elc.session_id = '80a614f6-1917-4349-8b12-9e93f9b0f3d4' 
    AND elc.change_type = 'delete'
    AND elc.change_status = 'applied'
  LIMIT 1
)
-- Step 1: Delete extraction_listing_changes (this should work)
-- DELETE FROM extraction_listing_changes 
-- WHERE existing_listing_id = (SELECT listing_id FROM test_listing);
-- For safety, let's just SELECT to see what would be affected
SELECT 
  'extraction_listing_changes to delete:' as info,
  COUNT(*) as count,
  ARRAY_AGG(id) as change_ids
FROM extraction_listing_changes elc
WHERE existing_listing_id = (
  SELECT 
    elc2.existing_listing_id
  FROM extraction_listing_changes elc2
  JOIN listings l ON l.id = elc2.existing_listing_id
  WHERE elc2.session_id = '80a614f6-1917-4349-8b12-9e93f9b0f3d4' 
    AND elc2.change_type = 'delete'
    AND elc2.change_status = 'applied'
  LIMIT 1
);

-- Step 2: Check lease_pricing records
WITH test_listing AS (
  SELECT 
    elc.existing_listing_id as listing_id
  FROM extraction_listing_changes elc
  JOIN listings l ON l.id = elc.existing_listing_id
  WHERE elc.session_id = '80a614f6-1917-4349-8b12-9e93f9b0f3d4' 
    AND elc.change_type = 'delete'
    AND elc.change_status = 'applied'
  LIMIT 1
)
SELECT 
  'lease_pricing to delete:' as info,
  COUNT(*) as count,
  ARRAY_AGG(id) as pricing_ids
FROM lease_pricing lp
WHERE listing_id = (SELECT listing_id FROM test_listing);

-- Step 3: Check the actual listing
WITH test_listing AS (
  SELECT 
    elc.existing_listing_id as listing_id
  FROM extraction_listing_changes elc
  JOIN listings l ON l.id = elc.existing_listing_id
  WHERE elc.session_id = '80a614f6-1917-4349-8b12-9e93f9b0f3d4' 
    AND elc.change_type = 'delete'
    AND elc.change_status = 'applied'
  LIMIT 1
)
SELECT 
  'listing to delete:' as info,
  l.id,
  l.make,
  l.model,
  l.variant,
  l.lease_score,
  l.lease_score_calculated_at,
  l.retail_price
FROM listings l
WHERE id = (SELECT listing_id FROM test_listing);

ROLLBACK;