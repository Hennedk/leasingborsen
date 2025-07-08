-- Comprehensive test cases for AI extraction flow
-- Run these queries to verify the extraction system is working correctly

-- ============================================
-- TEST 1: Verify extraction session data integrity
-- ============================================
SELECT 
  'TEST 1: Session Data Integrity' as test_name,
  es.id,
  es.seller_id,
  es.status,
  s.name as seller_name,
  es.total_extracted,
  es.total_matched,
  es.total_new,
  es.total_updated,
  es.total_unchanged,
  es.total_deleted,
  (es.total_extracted = es.total_new + es.total_matched) as extracted_count_valid,
  (es.total_matched = es.total_updated + es.total_unchanged) as matched_count_valid
FROM extraction_sessions es
JOIN sellers s ON es.seller_id = s.id
WHERE es.id IN (
  '01ed5ac1-d5cf-40de-8521-4aa23f915f5d',
  'e887e753-e166-42dd-b9c7-62fb9c388f8c',
  '1f236201-7387-4038-9b7f-2c15c26cbd09'
)
ORDER BY es.created_at DESC;

-- ============================================
-- TEST 2: Verify change counts match session totals
-- ============================================
WITH change_counts AS (
  SELECT 
    session_id,
    COUNT(*) FILTER (WHERE change_type = 'create') as creates,
    COUNT(*) FILTER (WHERE change_type = 'update') as updates,
    COUNT(*) FILTER (WHERE change_type = 'unchanged') as unchanged,
    COUNT(*) FILTER (WHERE change_type = 'delete') as deletes,
    COUNT(*) FILTER (WHERE change_type = 'missing_model') as missing_models,
    COUNT(*) as total_changes
  FROM extraction_listing_changes
  WHERE session_id IN (
    '01ed5ac1-d5cf-40de-8521-4aa23f915f5d',
    'e887e753-e166-42dd-b9c7-62fb9c388f8c',
    '1f236201-7387-4038-9b7f-2c15c26cbd09'
  )
  GROUP BY session_id
)
SELECT 
  'TEST 2: Change Counts Match' as test_name,
  es.id,
  es.total_new = cc.creates as creates_match,
  es.total_updated = cc.updates as updates_match,
  es.total_unchanged = cc.unchanged as unchanged_match,
  es.total_deleted = cc.deletes as deletes_match,
  cc.missing_models,
  cc.total_changes
FROM extraction_sessions es
JOIN change_counts cc ON es.id = cc.session_id;

-- ============================================
-- TEST 3: Check for duplicate change records
-- ============================================
SELECT 
  'TEST 3: Duplicate Changes' as test_name,
  session_id,
  existing_listing_id,
  change_type,
  COUNT(*) as duplicate_count,
  ARRAY_AGG(id) as duplicate_ids
FROM extraction_listing_changes
WHERE session_id IN (
    '01ed5ac1-d5cf-40de-8521-4aa23f915f5d',
    'e887e753-e166-42dd-b9c7-62fb9c388f8c',
    '1f236201-7387-4038-9b7f-2c15c26cbd09'
  )
  AND existing_listing_id IS NOT NULL
GROUP BY session_id, existing_listing_id, change_type
HAVING COUNT(*) > 1;

-- ============================================
-- TEST 4: Verify deletion detection completeness
-- ============================================
WITH seller_listings AS (
  SELECT 
    es.id as session_id,
    es.seller_id,
    COUNT(DISTINCT l.id) as total_listings
  FROM extraction_sessions es
  JOIN listings l ON l.seller_id = es.seller_id
  WHERE es.id IN (
    '01ed5ac1-d5cf-40de-8521-4aa23f915f5d',
    'e887e753-e166-42dd-b9c7-62fb9c388f8c',
    '1f236201-7387-4038-9b7f-2c15c26cbd09'
  )
  GROUP BY es.id, es.seller_id
),
matched_listings AS (
  SELECT 
    session_id,
    COUNT(DISTINCT existing_listing_id) as matched_count
  FROM extraction_listing_changes
  WHERE session_id IN (
    '01ed5ac1-d5cf-40de-8521-4aa23f915f5d',
    'e887e753-e166-42dd-b9c7-62fb9c388f8c',
    '1f236201-7387-4038-9b7f-2c15c26cbd09'
  )
    AND existing_listing_id IS NOT NULL
    AND change_type IN ('update', 'unchanged')
  GROUP BY session_id
),
delete_changes AS (
  SELECT 
    session_id,
    COUNT(DISTINCT existing_listing_id) as delete_count
  FROM extraction_listing_changes
  WHERE session_id IN (
    '01ed5ac1-d5cf-40de-8521-4aa23f915f5d',
    'e887e753-e166-42dd-b9c7-62fb9c388f8c',
    '1f236201-7387-4038-9b7f-2c15c26cbd09'
  )
    AND change_type = 'delete'
  GROUP BY session_id
)
SELECT 
  'TEST 4: Deletion Detection' as test_name,
  sl.session_id,
  sl.total_listings,
  COALESCE(ml.matched_count, 0) as matched_listings,
  COALESCE(dc.delete_count, 0) as delete_changes,
  sl.total_listings - COALESCE(ml.matched_count, 0) as expected_deletes,
  (sl.total_listings - COALESCE(ml.matched_count, 0) = COALESCE(dc.delete_count, 0)) as deletion_detection_correct
FROM seller_listings sl
LEFT JOIN matched_listings ml ON sl.session_id = ml.session_id
LEFT JOIN delete_changes dc ON sl.session_id = dc.session_id;

-- ============================================
-- TEST 5: Check for orphaned listings (should be marked for deletion)
-- ============================================
SELECT 
  'TEST 5: Orphaned Listings' as test_name,
  es.id as session_id,
  l.id as listing_id,
  m.name as make,
  mo.name as model,
  l.variant,
  NOT EXISTS (
    SELECT 1 FROM extraction_listing_changes elc 
    WHERE elc.session_id = es.id 
    AND elc.existing_listing_id = l.id
  ) as is_orphaned
FROM extraction_sessions es
JOIN listings l ON l.seller_id = es.seller_id
LEFT JOIN makes m ON l.make_id = m.id
LEFT JOIN models mo ON l.model_id = mo.id
WHERE es.id = '01ed5ac1-d5cf-40de-8521-4aa23f915f5d'
  AND NOT EXISTS (
    SELECT 1 FROM extraction_listing_changes elc 
    WHERE elc.session_id = es.id 
    AND elc.existing_listing_id = l.id
  );

-- ============================================
-- TEST 6: Verify change type distribution
-- ============================================
SELECT 
  'TEST 6: Change Distribution' as test_name,
  session_id,
  change_type,
  change_status,
  COUNT(*) as count,
  COUNT(DISTINCT existing_listing_id) as unique_listings
FROM extraction_listing_changes
WHERE session_id IN (
    '01ed5ac1-d5cf-40de-8521-4aa23f915f5d',
    'e887e753-e166-42dd-b9c7-62fb9c388f8c',
    '1f236201-7387-4038-9b7f-2c15c26cbd09'
  )
GROUP BY session_id, change_type, change_status
ORDER BY session_id, change_type;

-- ============================================
-- TEST 7: Check data quality of delete changes
-- ============================================
SELECT 
  'TEST 7: Delete Change Quality' as test_name,
  id,
  existing_listing_id,
  extracted_data->>'make' as make,
  extracted_data->>'model' as model,
  extracted_data->>'variant' as variant,
  extracted_data->>'monthly_price' as monthly_price,
  change_summary,
  created_at
FROM extraction_listing_changes
WHERE session_id = '01ed5ac1-d5cf-40de-8521-4aa23f915f5d'
  AND change_type = 'delete'
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- TEST 8: Verify no cross-contamination between sellers
-- ============================================
WITH session_sellers AS (
  SELECT DISTINCT 
    es.id as session_id,
    es.seller_id,
    s.name as seller_name
  FROM extraction_sessions es
  JOIN sellers s ON es.seller_id = s.id
  WHERE es.id IN (
    '01ed5ac1-d5cf-40de-8521-4aa23f915f5d',
    'e887e753-e166-42dd-b9c7-62fb9c388f8c',
    '1f236201-7387-4038-9b7f-2c15c26cbd09'
  )
)
SELECT 
  'TEST 8: Cross-Contamination Check' as test_name,
  ss.session_id,
  ss.seller_name as session_seller,
  l.seller_id as listing_seller_id,
  s2.name as listing_seller_name,
  COUNT(*) as mismatched_count
FROM session_sellers ss
JOIN extraction_listing_changes elc ON elc.session_id = ss.session_id
JOIN listings l ON l.id = elc.existing_listing_id
JOIN sellers s2 ON s2.id = l.seller_id
WHERE l.seller_id != ss.seller_id
  AND elc.existing_listing_id IS NOT NULL
GROUP BY ss.session_id, ss.seller_name, l.seller_id, s2.name;

-- ============================================
-- Summary Report
-- ============================================
SELECT 
  'SUMMARY' as report,
  COUNT(DISTINCT session_id) as total_sessions,
  SUM(CASE WHEN change_type = 'create' THEN 1 ELSE 0 END) as total_creates,
  SUM(CASE WHEN change_type = 'update' THEN 1 ELSE 0 END) as total_updates,
  SUM(CASE WHEN change_type = 'unchanged' THEN 1 ELSE 0 END) as total_unchanged,
  SUM(CASE WHEN change_type = 'delete' THEN 1 ELSE 0 END) as total_deletes,
  SUM(CASE WHEN change_type = 'missing_model' THEN 1 ELSE 0 END) as total_missing_models
FROM extraction_listing_changes
WHERE session_id IN (
    '01ed5ac1-d5cf-40de-8521-4aa23f915f5d',
    'e887e753-e166-42dd-b9c7-62fb9c388f8c',
    '1f236201-7387-4038-9b7f-2c15c26cbd09'
  );