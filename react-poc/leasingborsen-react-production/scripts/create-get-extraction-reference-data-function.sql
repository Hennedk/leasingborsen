-- Create missing PostgreSQL function for fetching extraction reference data
-- This function provides reference data to AI extraction for better accuracy

CREATE OR REPLACE FUNCTION get_extraction_reference_data(
  seller_make_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  makes_models_data JSON;
  fuel_types_data JSON;
  transmissions_data JSON;
  body_types_data JSON;
BEGIN
  -- Get makes and models (filtered by seller_make_id if provided)
  SELECT json_object_agg(make_name, models) INTO makes_models_data
  FROM (
    SELECT 
      m.name as make_name,
      json_agg(
        json_build_object(
          'id', mod.id,
          'name', mod.name,
          'make_id', mod.make_id
        )
        ORDER BY mod.name
      ) as models
    FROM makes m
    LEFT JOIN models mod ON m.id = mod.make_id
    WHERE (seller_make_id IS NULL OR m.id = seller_make_id)
    GROUP BY m.id, m.name
  ) makes_with_models;

  -- Get fuel types
  SELECT json_agg(
    json_build_object(
      'id', id,
      'name', name
    )
    ORDER BY name
  ) INTO fuel_types_data
  FROM fuel_types;

  -- Get transmissions
  SELECT json_agg(
    json_build_object(
      'id', id,
      'name', name
    )
    ORDER BY name
  ) INTO transmissions_data
  FROM transmissions;

  -- Get body types
  SELECT json_agg(
    json_build_object(
      'id', id,
      'name', name
    )
    ORDER BY name
  ) INTO body_types_data
  FROM body_types;

  -- Build final result
  result := json_build_object(
    'makes_models', COALESCE(makes_models_data, '{}'::json),
    'fuel_types', COALESCE(fuel_types_data, '[]'::json),
    'transmissions', COALESCE(transmissions_data, '[]'::json),
    'body_types', COALESCE(body_types_data, '[]'::json),
    'seller_make_id', seller_make_id,
    'generated_at', NOW()
  );

  RETURN result;

EXCEPTION WHEN OTHERS THEN
  -- Return error information
  RETURN json_build_object(
    'error', SQLERRM,
    'makes_models', '{}'::json,
    'fuel_types', '[]'::json,
    'transmissions', '[]'::json,
    'body_types', '[]'::json
  );
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON FUNCTION get_extraction_reference_data IS 'Fetch reference data (makes, models, fuel types, etc.) for AI extraction context, optionally filtered by seller make';