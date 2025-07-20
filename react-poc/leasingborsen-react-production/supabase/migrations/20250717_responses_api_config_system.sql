-- Create Responses API configuration management system
-- This stores complete OpenAI Responses API configurations internally

-- Main configuration table for Responses API calls
CREATE TABLE IF NOT EXISTS responses_api_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  
  -- Core API parameters
  openai_prompt_id VARCHAR(100) NOT NULL,
  openai_prompt_version VARCHAR(20) NOT NULL DEFAULT 'latest',
  model VARCHAR(100) NOT NULL DEFAULT 'gpt-4-1106-preview',
  temperature DECIMAL(3,2) NOT NULL DEFAULT 0.1,
  max_completion_tokens INTEGER,
  
  -- Metadata
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Text format configurations (for response formatting)
CREATE TABLE IF NOT EXISTS text_format_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES responses_api_configs(id) ON DELETE CASCADE,
  format_type VARCHAR(50) NOT NULL, -- 'json_schema', 'text', etc.
  format_name VARCHAR(255),
  strict BOOLEAN DEFAULT false,
  schema_id UUID REFERENCES input_schemas(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Input schemas for structured outputs
CREATE TABLE IF NOT EXISTS input_schemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  schema_definition JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API call logging for monitoring and debugging
CREATE TABLE IF NOT EXISTS api_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES responses_api_configs(id),
  
  -- Request details
  openai_prompt_id VARCHAR(100) NOT NULL,
  openai_prompt_version VARCHAR(20) NOT NULL,
  model VARCHAR(100) NOT NULL,
  temperature DECIMAL(3,2) NOT NULL,
  
  -- Response details
  completion_tokens INTEGER,
  total_tokens INTEGER,
  response_status VARCHAR(20),
  error_message TEXT,
  
  -- Timing
  request_start TIMESTAMPTZ DEFAULT NOW(),
  request_end TIMESTAMPTZ,
  duration_ms INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configuration versioning for change tracking
CREATE TABLE IF NOT EXISTS config_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES responses_api_configs(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  
  -- Snapshot of configuration at this version
  openai_prompt_id VARCHAR(100) NOT NULL,
  openai_prompt_version VARCHAR(20) NOT NULL,
  model VARCHAR(100) NOT NULL,
  temperature DECIMAL(3,2) NOT NULL,
  max_completion_tokens INTEGER,
  
  -- Change metadata
  changelog TEXT,
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(config_id, version)
);

-- Create indexes for performance
CREATE INDEX idx_responses_api_configs_active ON responses_api_configs(active) WHERE active = true;
CREATE INDEX idx_text_format_configs_config_id ON text_format_configs(config_id);
CREATE INDEX idx_api_call_logs_config_id ON api_call_logs(config_id);
CREATE INDEX idx_api_call_logs_created_at ON api_call_logs(created_at DESC);
CREATE INDEX idx_config_versions_config_id ON config_versions(config_id);
CREATE INDEX idx_config_versions_version ON config_versions(config_id, version DESC);

-- Insert vehicle extraction JSON schema
INSERT INTO input_schemas (name, description, schema_definition) VALUES (
  'vehicle_extraction',
  'JSON schema for vehicle extraction from PDFs',
  '{
    "type": "object",
    "properties": {
      "cars": {
        "type": "array",
        "description": "List of vehicles extracted from the PDF",
        "items": {
          "type": "object",
          "properties": {
            "make": {
              "type": "string",
              "description": "Vehicle manufacturer (e.g., Volkswagen, Audi)",
              "minLength": 1
            },
            "model": {
              "type": "string", 
              "description": "Vehicle model name (e.g., Golf, A3)",
              "minLength": 1
            },
            "variant": {
              "type": "string",
              "description": "Vehicle variant/trim with HK for horsepower (e.g., Style 150 HK)",
              "minLength": 1
            },
            "hp": {
              "type": ["integer", "null"],
              "description": "Horsepower as a number",
              "minimum": 0,
              "maximum": 2000
            },
            "ft": {
              "type": "integer",
              "description": "Fuel type code: 1=Electric, 2=Hybrid-Petrol, 3=Petrol, 4=Diesel, 5=Hybrid-Diesel, 6=Plug-in-Petrol, 7=Plug-in-Diesel",
              "enum": [1, 2, 3, 4, 5, 6, 7]
            },
            "tr": {
              "type": "integer",
              "description": "Transmission code: 1=Automatic, 2=Manual",
              "enum": [1, 2]
            },
            "bt": {
              "type": "integer",
              "description": "Body type code: 1=SUV, 2=Hatchback, 3=Sedan, 4=Stationcar, 5=Coupe, 6=Cabriolet, 7=Crossover, 8=Minibus, 9=Mikro",
              "enum": [1, 2, 3, 4, 5, 6, 7, 8, 9]
            },
            "wltp": {
              "type": ["integer", "null"],
              "description": "WLTP range in km (for electric) or fuel efficiency",
              "minimum": 0,
              "maximum": 1000
            },
            "co2": {
              "type": ["integer", "null"],
              "description": "CO2 emissions in g/km",
              "minimum": 0,
              "maximum": 500
            },
            "kwh100": {
              "type": ["number", "null"],
              "description": "Electric consumption in kWh/100km",
              "minimum": 0,
              "maximum": 100
            },
            "l100": {
              "type": ["number", "null"],
              "description": "Fuel consumption in liters/100km",
              "minimum": 0,
              "maximum": 50
            },
            "tax": {
              "type": ["integer", "null"],
              "description": "CO2 tax per half year in DKK",
              "minimum": 0,
              "maximum": 100000
            },
            "offers": {
              "type": "array",
              "description": "List of leasing offers for this vehicle",
              "minItems": 1,
              "items": {
                "type": "array",
                "description": "Array with exactly 5 elements: [monthly_price, first_payment, period_months, km_per_year, total_price]",
                "minItems": 5,
                "maxItems": 5,
                "items": {
                  "anyOf": [
                    {
                      "type": "integer",
                      "minimum": 0
                    },
                    {
                      "type": "null"
                    }
                  ]
                }
              }
            }
          },
          "required": [
            "make",
            "model", 
            "variant",
            "hp",
            "ft",
            "tr",
            "bt",
            "wltp",
            "co2",
            "kwh100",
            "l100",
            "tax",
            "offers"
          ],
          "additionalProperties": false
        }
      }
    },
    "required": ["cars"],
    "additionalProperties": false
  }'::jsonb
);

-- Insert main vehicle extraction configuration
INSERT INTO responses_api_configs (
  name,
  description,
  openai_prompt_id,
  openai_prompt_version,
  model,
  temperature,
  max_completion_tokens
) VALUES (
  'vehicle-extraction',
  'Main configuration for extracting vehicle data from PDF brochures using Responses API',
  'prompt_01jafqmdnp4p6q1wdfm0f7n9jj',
  '13',
  'gpt-4-1106-preview',
  0.1,
  16384
);

-- Insert text format configuration linking to the schema
INSERT INTO text_format_configs (
  config_id,
  format_type,
  format_name,
  strict,
  schema_id
) 
SELECT 
  c.id,
  'json_schema',
  'vehicle_extraction',
  true,
  s.id
FROM responses_api_configs c, input_schemas s
WHERE c.name = 'vehicle-extraction'
  AND s.name = 'vehicle_extraction';

-- Insert initial version record
INSERT INTO config_versions (
  config_id,
  version,
  openai_prompt_id,
  openai_prompt_version,
  model,
  temperature,
  max_completion_tokens,
  changelog,
  created_by
)
SELECT 
  id,
  1,
  openai_prompt_id,
  openai_prompt_version,
  model,
  temperature,
  max_completion_tokens,
  'Initial configuration - migrated from hardcoded values',
  'system'
FROM responses_api_configs
WHERE name = 'vehicle-extraction';

-- Function to get active configuration
CREATE OR REPLACE FUNCTION get_responses_api_config(config_name VARCHAR)
RETURNS TABLE (
  config_id UUID,
  openai_prompt_id VARCHAR,
  openai_prompt_version VARCHAR,
  model VARCHAR,
  temperature DECIMAL,
  max_completion_tokens INTEGER,
  format_type VARCHAR,
  format_name VARCHAR,
  strict BOOLEAN,
  schema_definition JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.openai_prompt_id,
    c.openai_prompt_version,
    c.model,
    c.temperature,
    c.max_completion_tokens,
    tf.format_type,
    tf.format_name,
    tf.strict,
    s.schema_definition
  FROM responses_api_configs c
  LEFT JOIN text_format_configs tf ON tf.config_id = c.id
  LEFT JOIN input_schemas s ON s.id = tf.schema_id
  WHERE c.name = config_name
    AND c.active = true;
END;
$$ LANGUAGE plpgsql;

-- Function to log API calls
CREATE OR REPLACE FUNCTION log_api_call(
  p_config_id UUID,
  p_openai_prompt_id VARCHAR,
  p_openai_prompt_version VARCHAR,
  p_model VARCHAR,
  p_temperature DECIMAL,
  p_completion_tokens INTEGER DEFAULT NULL,
  p_total_tokens INTEGER DEFAULT NULL,
  p_response_status VARCHAR DEFAULT 'success',
  p_error_message TEXT DEFAULT NULL,
  p_duration_ms INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO api_call_logs (
    config_id,
    openai_prompt_id,
    openai_prompt_version,
    model,
    temperature,
    completion_tokens,
    total_tokens,
    response_status,
    error_message,
    duration_ms,
    request_end
  ) VALUES (
    p_config_id,
    p_openai_prompt_id,
    p_openai_prompt_version,
    p_model,
    p_temperature,
    p_completion_tokens,
    p_total_tokens,
    p_response_status,
    p_error_message,
    p_duration_ms,
    NOW()
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create new configuration version
CREATE OR REPLACE FUNCTION create_config_version(
  p_config_name VARCHAR,
  p_openai_prompt_id VARCHAR,
  p_openai_prompt_version VARCHAR,
  p_model VARCHAR,
  p_temperature DECIMAL,
  p_max_completion_tokens INTEGER,
  p_changelog TEXT,
  p_created_by VARCHAR DEFAULT 'system'
)
RETURNS INTEGER AS $$
DECLARE
  v_config_id UUID;
  v_new_version INTEGER;
BEGIN
  -- Get config ID
  SELECT id INTO v_config_id FROM responses_api_configs WHERE name = p_config_name;
  
  IF v_config_id IS NULL THEN
    RAISE EXCEPTION 'Configuration % not found', p_config_name;
  END IF;
  
  -- Get next version number
  SELECT COALESCE(MAX(version), 0) + 1 INTO v_new_version
  FROM config_versions
  WHERE config_id = v_config_id;
  
  -- Update main configuration
  UPDATE responses_api_configs SET
    openai_prompt_id = p_openai_prompt_id,
    openai_prompt_version = p_openai_prompt_version,
    model = p_model,
    temperature = p_temperature,
    max_completion_tokens = p_max_completion_tokens,
    updated_at = NOW()
  WHERE id = v_config_id;
  
  -- Insert version record
  INSERT INTO config_versions (
    config_id,
    version,
    openai_prompt_id,
    openai_prompt_version,
    model,
    temperature,
    max_completion_tokens,
    changelog,
    created_by
  ) VALUES (
    v_config_id,
    v_new_version,
    p_openai_prompt_id,
    p_openai_prompt_version,
    p_model,
    p_temperature,
    p_max_completion_tokens,
    p_changelog,
    p_created_by
  );
  
  RETURN v_new_version;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions for service role
GRANT SELECT ON responses_api_configs TO service_role;
GRANT SELECT ON text_format_configs TO service_role;
GRANT SELECT ON input_schemas TO service_role;
GRANT INSERT, SELECT ON api_call_logs TO service_role;
GRANT SELECT ON config_versions TO service_role;
GRANT EXECUTE ON FUNCTION get_responses_api_config TO service_role;
GRANT EXECUTE ON FUNCTION log_api_call TO service_role;
GRANT EXECUTE ON FUNCTION create_config_version TO service_role;