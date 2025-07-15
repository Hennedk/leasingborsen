-- Test the UPDATE logic directly with the problematic change

-- First, let's see what's in the extraction_listing_changes table for this change
SELECT 
  id,
  change_type,
  change_status,
  existing_listing_id,
  extracted_data,
  field_changes
FROM extraction_listing_changes
WHERE id = 'c108a388-dce3-4cac-9ba8-f8b1d8a63065';

-- Check if the listing exists
SELECT 
  id,
  make_id,
  model_id,
  variant
FROM listings
WHERE id = '16bfb19a-c9a1-48b4-ad2d-a51f055c8d73';

-- Check existing pricing
SELECT 
  listing_id,
  monthly_price,
  period_months,
  mileage_per_year
FROM lease_pricing
WHERE listing_id = '16bfb19a-c9a1-48b4-ad2d-a51f055c8d73'
ORDER BY monthly_price
LIMIT 5;

-- Now let's manually test the UPDATE logic
DO $$
DECLARE
  v_extraction_data JSONB;
  v_existing_listing_id UUID;
  v_make_id UUID;
  v_model_id UUID;
  v_existing_make_id UUID;
BEGIN
  -- Get the extraction data
  SELECT extracted_data, existing_listing_id
  INTO v_extraction_data, v_existing_listing_id
  FROM extraction_listing_changes
  WHERE id = 'c108a388-dce3-4cac-9ba8-f8b1d8a63065';
  
  RAISE NOTICE 'Extraction data: %', v_extraction_data;
  RAISE NOTICE 'Existing listing ID: %', v_existing_listing_id;
  
  -- Get existing make_id
  SELECT make_id INTO v_existing_make_id 
  FROM listings 
  WHERE id = v_existing_listing_id;
  
  RAISE NOTICE 'Existing make_id: %', v_existing_make_id;
  
  -- Look up make and model
  IF v_extraction_data ? 'make' AND v_extraction_data->>'make' IS NOT NULL THEN
    SELECT id INTO v_make_id FROM makes WHERE LOWER(name) = LOWER(v_extraction_data->>'make');
    RAISE NOTICE 'Make lookup: % -> %', v_extraction_data->>'make', v_make_id;
  END IF;
  
  IF v_extraction_data ? 'model' AND v_extraction_data->>'model' IS NOT NULL THEN
    SELECT id INTO v_model_id FROM models 
    WHERE LOWER(name) = LOWER(v_extraction_data->>'model') 
      AND make_id = COALESCE(v_make_id, v_existing_make_id);
    RAISE NOTICE 'Model lookup: % -> %', v_extraction_data->>'model', v_model_id;
  END IF;
  
  -- Check offers
  IF v_extraction_data ? 'offers' THEN
    RAISE NOTICE 'Offers found: %', jsonb_array_length(v_extraction_data->'offers');
    RAISE NOTICE 'First offer: %', v_extraction_data->'offers'->0;
  ELSE
    RAISE NOTICE 'No offers found in extraction data';
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error: %', SQLERRM;
END $$;