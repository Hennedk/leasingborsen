-- Add support for programmatic prompt creation
-- This migration adds RPC functions for storing programmatically created OpenAI prompts

-- Create RPC function to store new responses API configuration
CREATE OR REPLACE FUNCTION create_responses_config(
  p_config_name TEXT,
  p_openai_prompt_id TEXT,
  p_openai_prompt_version TEXT,
  p_model TEXT,
  p_temperature DECIMAL,
  p_max_completion_tokens INTEGER,
  p_format_type TEXT DEFAULT 'json_schema',
  p_format_name TEXT DEFAULT 'vehicle_extraction',
  p_strict BOOLEAN DEFAULT true,
  p_active BOOLEAN DEFAULT true
) RETURNS TEXT AS $$
DECLARE
  v_config_id TEXT;
BEGIN
  -- Generate unique config ID
  v_config_id := p_config_name || '-' || extract(epoch from now())::text;
  
  -- Insert into responses_api_configs
  INSERT INTO responses_api_configs (
    config_id,
    config_name,
    openai_prompt_id,
    openai_prompt_version,
    model,
    temperature,
    max_completion_tokens,
    active,
    created_at,
    updated_at
  ) VALUES (
    v_config_id,
    p_config_name,
    p_openai_prompt_id,
    p_openai_prompt_version,
    p_model,
    p_temperature,
    p_max_completion_tokens,
    p_active,
    NOW(),
    NOW()
  );
  
  -- Insert text format configuration if provided
  IF p_format_type IS NOT NULL THEN
    INSERT INTO text_format_configs (
      config_id,
      format_type,
      format_name,
      strict,
      created_at
    ) VALUES (
      v_config_id,
      p_format_type,
      p_format_name,
      p_strict,
      NOW()
    );
  END IF;
  
  -- Create version entry
  INSERT INTO config_versions (
    config_id,
    version_number,
    openai_prompt_id,
    openai_prompt_version,
    model,
    temperature,
    max_completion_tokens,
    changelog,
    created_by,
    created_at
  ) VALUES (
    v_config_id,
    1,
    p_openai_prompt_id,
    p_openai_prompt_version,
    p_model,
    p_temperature,
    p_max_completion_tokens,
    'Initial programmatic creation',
    'system',
    NOW()
  );
  
  RETURN v_config_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to check if a configuration exists
CREATE OR REPLACE FUNCTION config_exists(p_config_name TEXT) 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM responses_api_configs 
    WHERE config_name = p_config_name AND active = true
  );
END;
$$ LANGUAGE plpgsql;

-- Create function to update configuration activity status
CREATE OR REPLACE FUNCTION set_config_active(p_config_name TEXT, p_active BOOLEAN)
RETURNS VOID AS $$
BEGIN
  UPDATE responses_api_configs 
  SET active = p_active, updated_at = NOW()
  WHERE config_name = p_config_name;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions for service role
GRANT EXECUTE ON FUNCTION create_responses_config TO service_role;
GRANT EXECUTE ON FUNCTION config_exists TO service_role;
GRANT EXECUTE ON FUNCTION set_config_active TO service_role;

-- Add comment
COMMENT ON FUNCTION create_responses_config IS 'Creates a new Responses API configuration with programmatically created OpenAI prompts';