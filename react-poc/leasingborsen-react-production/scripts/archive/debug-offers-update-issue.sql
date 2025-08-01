-- Debug why offers are not being updated properly in session 64ad98ac-06fc-40ad-9cef-6c0aeb6323b7
-- This will help identify why the same 14 update changes keep being detected

-- 1. Check the extracted offers data structure
SELECT 
  'Extracted offers structure:' as info,
  id,
  existing_listing_id,
  extracted_data ? 'offers' as has_offers,
  jsonb_array_length(COALESCE(extracted_data->'offers', '[]'::jsonb)) as offers_count,
  extracted_data->'offers'->0 as first_offer_sample
FROM extraction_listing_changes 
WHERE session_id = '64ad98ac-06fc-40ad-9cef-6c0aeb6323b7'
  AND change_type = 'update'
LIMIT 5;

-- 2. Check current lease pricing for these listings
WITH update_changes AS (
  SELECT DISTINCT existing_listing_id
  FROM extraction_listing_changes 
  WHERE session_id = '64ad98ac-06fc-40ad-9cef-6c0aeb6323b7'
    AND change_type = 'update'
  LIMIT 5
)
SELECT 
  'Current lease pricing:' as info,
  uc.existing_listing_id,
  COUNT(lp.id) as pricing_records_count,
  array_agg(lp.monthly_price) as monthly_prices,
  array_agg(lp.period_months) as period_months_values
FROM update_changes uc
LEFT JOIN lease_pricing lp ON lp.listing_id = uc.existing_listing_id
GROUP BY uc.existing_listing_id;

-- 3. Compare extracted offers vs current lease pricing for one specific case
WITH first_update AS (
  SELECT 
    existing_listing_id,
    extracted_data->'offers' as extracted_offers
  FROM extraction_listing_changes 
  WHERE session_id = '64ad98ac-06fc-40ad-9cef-6c0aeb6323b7'
    AND change_type = 'update'
  LIMIT 1
)
SELECT 
  'Comparison for first listing:' as info,
  fu.existing_listing_id,
  'Extracted offers:' as extracted_label,
  fu.extracted_offers,
  'Current pricing:' as current_label,
  jsonb_agg(
    jsonb_build_object(
      'monthly_price', lp.monthly_price,
      'period_months', lp.period_months,
      'mileage_per_year', lp.mileage_per_year,
      'first_payment', lp.first_payment
    )
  ) as current_pricing
FROM first_update fu
LEFT JOIN lease_pricing lp ON lp.listing_id = fu.existing_listing_id
GROUP BY fu.existing_listing_id, fu.extracted_offers;

-- 4. Test the lease pricing update logic manually for one change
-- Get the first update change and manually test the pricing update
WITH test_update AS (
  SELECT 
    id,
    existing_listing_id,
    extracted_data
  FROM extraction_listing_changes 
  WHERE session_id = '64ad98ac-06fc-40ad-9cef-6c0aeb6323b7'
    AND change_type = 'update'
  LIMIT 1
)
SELECT 
  'Manual test of pricing update:' as info,
  tu.id as change_id,
  tu.existing_listing_id,
  CASE 
    WHEN tu.extracted_data ? 'offers' AND jsonb_array_length(tu.extracted_data->'offers') > 0 
    THEN 'Has offers - should update pricing'
    ELSE 'No offers - pricing should not be updated'
  END as update_decision,
  jsonb_array_length(COALESCE(tu.extracted_data->'offers', '[]'::jsonb)) as offers_count
FROM test_update tu;

-- 5. Check for any data type issues in the offers
SELECT 
  'Data type validation:' as info,
  id,
  extracted_data->'offers'->0->>'monthly_price' as monthly_price_text,
  extracted_data->'offers'->0->>'period_months' as period_months_text,
  extracted_data->'offers'->0->>'mileage_per_year' as mileage_per_year_text,
  extracted_data->'offers'->0->>'first_payment' as first_payment_text,
  -- Test if they can be cast to proper types
  CASE 
    WHEN (extracted_data->'offers'->0->>'monthly_price')::text ~ '^[0-9]+\.?[0-9]*$'
    THEN 'Valid decimal'
    ELSE 'Invalid decimal format'
  END as monthly_price_validation,
  CASE 
    WHEN (extracted_data->'offers'->0->>'period_months')::text ~ '^[0-9]+$'
    THEN 'Valid integer'
    ELSE 'Invalid integer format'
  END as period_months_validation
FROM extraction_listing_changes 
WHERE session_id = '64ad98ac-06fc-40ad-9cef-6c0aeb6323b7'
  AND change_type = 'update'
  AND extracted_data ? 'offers'
  AND jsonb_array_length(extracted_data->'offers') > 0
LIMIT 3;