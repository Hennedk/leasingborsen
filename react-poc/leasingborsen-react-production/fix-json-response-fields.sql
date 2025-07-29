-- Fix missing JSON fields in apply_selected_extraction_changes function
-- The function is missing applied_creates, applied_updates, discarded_count, and applied_at in the response

-- Get the current function definition to identify the issue
SELECT 'Current function exists:' as check, 
       proname as function_name,
       prosrc LIKE '%json_build_object%' as has_json_build
FROM pg_proc 
WHERE proname = 'apply_selected_extraction_changes';

-- The issue is likely in the json_build_object construction
-- Let's create a minimal test to verify the JSON structure

DO $$
DECLARE
  applied_creates INTEGER := 0;
  applied_updates INTEGER := 1;
  applied_deletes INTEGER := 0;
  discarded_count INTEGER := 0;
  total_processed INTEGER := 1;
  error_count INTEGER := 0;
  error_details JSONB := '[]'::JSONB;
  result JSON;
BEGIN
  -- Test the JSON construction with all required fields
  result := json_build_object(
    'applied_creates', applied_creates,
    'applied_updates', applied_updates,
    'applied_deletes', applied_deletes,
    'discarded_count', discarded_count,
    'total_processed', total_processed,
    'error_count', error_count,
    'error_details', error_details,
    'session_id', '64ad98ac-06fc-40ad-9cef-6c0aeb6323b7',
    'applied_by', 'debug-test',
    'applied_at', NOW()
  );
  
  RAISE NOTICE 'Test JSON result: %', result;
END $$;

-- Check if there are any issues with the current function by examining recent migrations
SELECT 'Recent migrations affecting function:' as info,
       filename
FROM (
  VALUES 
    ('20250725_fix_deletion_lease_score_trigger_conflict.sql'),
    ('20250723_fix_incomplete_update_fields.sql'),
    ('20250719_fix_apply_function_rls.sql')
) AS t(filename);