-- Fix extraction session 26665971-d8c5-43ce-b264-a5daa6273e5f
-- Apply the 6 pending UPDATE changes manually

-- First, let's check the current state
SELECT 
  'Current session state:' as info,
  status,
  total_extracted,
  total_updated, 
  total_deleted
FROM extraction_sessions 
WHERE id = '26665971-d8c5-43ce-b264-a5daa6273e5f';

-- Check pending changes
SELECT 
  'Pending changes:' as info,
  change_type,
  change_status,
  COUNT(*) as count
FROM extraction_listing_changes
WHERE session_id = '26665971-d8c5-43ce-b264-a5daa6273e5f'
GROUP BY change_type, change_status
ORDER BY change_type, change_status;

-- Apply all 6 pending UPDATE changes
-- This will call the Edge Function via PostgreSQL function
SELECT apply_selected_extraction_changes(
  '26665971-d8c5-43ce-b264-a5daa6273e5f'::UUID,
  ARRAY[
    '0bec7ce3-d4d0-49a6-9671-01ce0e4969ad'::UUID,
    '5b8c85c8-ad7c-4c56-83cb-e8f2c4d91a9c'::UUID,
    'a0f06d5c-c27f-48a3-9f1e-85e4b2d9c7d1'::UUID,
    'c9e85d2c-2a3f-4b67-9834-7f5a1c8e6d2b'::UUID,
    'd8f2b1a5-7c4e-46f9-b2d5-9e8f3a7c6b1d'::UUID,
    'f7a9c4e2-5d8b-43a1-8f6e-2b5c9d7a4e8f'::UUID
  ],
  'admin'
) as result;

-- Verify the results
SELECT 
  'After applying changes:' as info,
  status,
  applied_at,
  total_updated,
  total_deleted
FROM extraction_sessions 
WHERE id = '26665971-d8c5-43ce-b264-a5daa6273e5f';

-- Check if any changes are still pending
SELECT 
  'Remaining pending changes:' as info,
  change_type,
  change_status,
  COUNT(*) as count
FROM extraction_listing_changes
WHERE session_id = '26665971-d8c5-43ce-b264-a5daa6273e5f'
  AND change_status = 'pending'
GROUP BY change_type, change_status;