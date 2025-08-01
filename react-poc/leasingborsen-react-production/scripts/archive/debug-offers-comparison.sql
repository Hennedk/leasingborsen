-- Deep dive into why offers aren't updating - check current vs extracted
-- Run this to see what's actually happening with the lease pricing updates

-- 1. Get detailed comparison for first few updates
WITH update_details AS (
  SELECT 
    elc.id,
    elc.existing_listing_id,
    elc.extracted_data->'offers' as extracted_offers,
    elc.change_status
  FROM extraction_listing_changes elc
  WHERE elc.session_id = '64ad98ac-06fc-40ad-9cef-6c0aeb6323b7'
    AND elc.change_type = 'update'
  LIMIT 3
)
SELECT 
  'Current vs Extracted:' as info,
  ud.id as change_id,
  ud.existing_listing_id,
  ud.change_status,
  -- Current pricing
  COALESCE(
    (SELECT jsonb_agg(
      jsonb_build_object(
        'monthly_price', lp.monthly_price::text,
        'period_months', lp.period_months::text,
        'mileage_per_year', lp.mileage_per_year::text,
        'first_payment', COALESCE(lp.first_payment::text, 'null')
      )
    ) FROM lease_pricing lp WHERE lp.listing_id = ud.existing_listing_id),
    '[]'::jsonb
  ) as current_pricing,
  -- Extracted pricing
  ud.extracted_offers as extracted_pricing,
  -- Check if they're identical
  COALESCE(
    (SELECT jsonb_agg(
      jsonb_build_object(
        'monthly_price', lp.monthly_price::text,
        'period_months', lp.period_months::text,
        'mileage_per_year', lp.mileage_per_year::text,
        'first_payment', COALESCE(lp.first_payment::text, 'null')
      )
    ) FROM lease_pricing lp WHERE lp.listing_id = ud.existing_listing_id),
    '[]'::jsonb
  ) = ud.extracted_offers as are_identical
FROM update_details ud;

-- 2. Check if the UPDATE changes have been marked as 'applied' but pricing didn't actually update
SELECT 
  'Applied status check:' as info,
  COUNT(*) as total_updates,
  COUNT(CASE WHEN change_status = 'applied' THEN 1 END) as applied_count,
  COUNT(CASE WHEN change_status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN change_status = 'discarded' THEN 1 END) as discarded_count
FROM extraction_listing_changes 
WHERE session_id = '64ad98ac-06fc-40ad-9cef-6c0aeb6323b7'
  AND change_type = 'update';

-- 3. Test the exact logic from our function - simulate the lease pricing update
DO $$
DECLARE
  test_listing_id UUID;
  test_offers JSONB;
  pricing_count_before INT;
  pricing_count_after INT;
BEGIN
  -- Get first update change
  SELECT existing_listing_id, extracted_data->'offers'
  INTO test_listing_id, test_offers
  FROM extraction_listing_changes 
  WHERE session_id = '64ad98ac-06fc-40ad-9cef-6c0aeb6323b7'
    AND change_type = 'update'
  LIMIT 1;
  
  -- Count current pricing
  SELECT COUNT(*) INTO pricing_count_before
  FROM lease_pricing WHERE listing_id = test_listing_id;
  
  RAISE NOTICE 'Test listing: %, Offers count: %, Current pricing count: %', 
    test_listing_id, 
    jsonb_array_length(COALESCE(test_offers, '[]'::jsonb)),
    pricing_count_before;
  
  -- Simulate the update logic
  IF test_offers IS NOT NULL AND jsonb_array_length(test_offers) > 0 THEN
    RAISE NOTICE 'Offers found, would delete existing pricing and insert new ones';
    RAISE NOTICE 'First offer: %', test_offers->0;
  ELSE
    RAISE NOTICE 'No offers found or empty offers array';
  END IF;
  
END $$;

-- 4. Check for any constraint violations or triggers that might be interfering
SELECT 
  'Constraint check:' as info,
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'lease_pricing'::regclass;