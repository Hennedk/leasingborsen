-- Quick fix for ambiguous column reference in ORDER BY
CREATE OR REPLACE FUNCTION apply_selected_extraction_changes(
  p_session_id UUID,
  p_selected_change_ids UUID[],
  p_applied_by TEXT DEFAULT 'system'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  change_record RECORD;
  applied_creates INTEGER := 0;
  applied_updates INTEGER := 0;
  applied_deletes INTEGER := 0;
  discarded_count INTEGER := 0;
  total_processed INTEGER := 0;
  extraction_data JSONB;
  existing_listing_id UUID;
  new_listing_id UUID;
  result JSON;
  v_make_id UUID;
  v_model_id UUID;
  v_body_type_id UUID;
  v_fuel_type_id UUID;
  v_transmission_id UUID;
  error_count INTEGER := 0;
  error_details JSONB := '[]'::JSONB;
  v_error_msg TEXT;
  v_listing_to_delete UUID;
  v_seller_id UUID;
  v_deletion_count INTEGER;
BEGIN
  -- Get the seller_id for this session
  SELECT seller_id INTO v_seller_id 
  FROM extraction_sessions 
  WHERE id = p_session_id;
  
  IF v_seller_id IS NULL THEN
    RAISE EXCEPTION 'Could not find session or seller_id for session %', p_session_id;
  END IF;
  
  -- Mark selected changes as 'applied' and non-selected as 'discarded'
  UPDATE extraction_listing_changes 
  SET 
    change_status = 'applied',
    reviewed_at = NOW()
  WHERE session_id = p_session_id 
    AND id = ANY(p_selected_change_ids)
    AND change_status = 'pending';
  
  UPDATE extraction_listing_changes 
  SET 
    change_status = 'discarded',
    reviewed_at = NOW()
  WHERE session_id = p_session_id 
    AND NOT (id = ANY(p_selected_change_ids))
    AND change_status = 'pending';
  
  -- Process each selected change (fixed ORDER BY ambiguity)
  FOR change_record IN 
    SELECT * FROM extraction_listing_changes 
    WHERE session_id = p_session_id 
      AND id = ANY(p_selected_change_ids)
      AND change_status = 'applied'
    ORDER BY 
      CASE extraction_listing_changes.change_type
        WHEN 'create' THEN 1
        WHEN 'update' THEN 2  
        WHEN 'delete' THEN 3
      END
  LOOP
    total_processed := total_processed + 1;
    extraction_data := change_record.extracted_data;
    existing_listing_id := change_record.existing_listing_id;
    
    v_error_msg := NULL;
    v_deletion_count := NULL;
    
    -- Process DELETE changes - COMPLETE FIX: Delete ALL references
    IF change_record.change_type = 'delete' AND existing_listing_id IS NOT NULL THEN
      BEGIN
        v_listing_to_delete := existing_listing_id;
        
        -- PHASE 1 COMPLETE FIX: Delete ALL extraction_listing_changes references
        -- This includes current session to prevent foreign key violations
        DELETE FROM extraction_listing_changes 
        WHERE existing_listing_id = v_listing_to_delete;
        
        -- Delete pricing first (foreign key constraint)
        DELETE FROM lease_pricing WHERE listing_id = v_listing_to_delete;
        
        -- Delete the listing and verify it was actually deleted
        DELETE FROM listings WHERE id = v_listing_to_delete;
        GET DIAGNOSTICS v_deletion_count = ROW_COUNT;
        
        -- Verify the deletion actually happened
        IF v_deletion_count = 0 THEN
          RAISE EXCEPTION 'Failed to delete listing %. Listing may not exist or deletion was blocked.', v_listing_to_delete;
        END IF;
        
        -- Only increment counter if deletion was successful
        applied_deletes := applied_deletes + 1;
        
      EXCEPTION 
        WHEN OTHERS THEN
          error_count := error_count + 1;
          v_error_msg := SQLERRM;
          
          error_details := error_details || jsonb_build_object(
            'change_id', change_record.id,
            'change_type', change_record.change_type,
            'existing_listing_id', existing_listing_id,
            'error', v_error_msg,
            'deletion_count', COALESCE(v_deletion_count, 0)
          );
      END;
    END IF;
  END LOOP;
  
  -- Update the extraction session status based on errors
  UPDATE extraction_sessions 
  SET 
    status = CASE 
      WHEN error_count > 0 THEN 'partially_applied'
      ELSE 'completed'
    END,
    applied_at = NOW()
  WHERE id = p_session_id;
  
  -- Build result JSON with ALL REQUIRED FIELDS
  result := json_build_object(
    'applied_creates', applied_creates,
    'applied_updates', applied_updates,
    'applied_deletes', applied_deletes,  
    'discarded_count', discarded_count,
    'total_processed', total_processed,
    'error_count', error_count,
    'error_details', error_details,
    'session_id', p_session_id,
    'applied_by', p_applied_by,
    'applied_at', NOW()
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and return failure result with ALL REQUIRED FIELDS
    RAISE LOG 'Error in apply_selected_extraction_changes: %', SQLERRM;
    
    result := json_build_object(
      'applied_creates', 0,
      'applied_updates', 0,
      'applied_deletes', 0,
      'discarded_count', 0,
      'total_processed', 0,
      'error_count', 1,
      'error_details', jsonb_build_array(
        jsonb_build_object(
          'error', SQLERRM,
          'context', 'function_level_error'
        )
      ),
      'session_id', p_session_id,
      'applied_by', p_applied_by,
      'applied_at', NOW()
    );
    
    RETURN result;
END;
$$;