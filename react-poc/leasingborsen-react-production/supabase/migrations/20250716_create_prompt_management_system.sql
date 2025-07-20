-- Create prompt management system tables
-- This replaces reliance on OpenAI's stored prompts API

-- Main prompts table
CREATE TABLE IF NOT EXISTS prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  model VARCHAR(100) NOT NULL DEFAULT 'gpt-4-1106-preview',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prompt versions table for version control
CREATE TABLE IF NOT EXISTS prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  system_prompt TEXT NOT NULL,
  user_prompt_template TEXT NOT NULL,
  model VARCHAR(100) NOT NULL,
  temperature DECIMAL(3,2) DEFAULT 0.1,
  max_tokens INTEGER DEFAULT 16000,
  response_format JSONB,
  metadata JSONB,
  changelog TEXT,
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(prompt_id, version)
);

-- Index for faster lookups
CREATE INDEX idx_prompt_versions_prompt_id ON prompt_versions(prompt_id);
CREATE INDEX idx_prompt_versions_version ON prompt_versions(prompt_id, version DESC);

-- Insert vehicle extraction prompt
INSERT INTO prompts (name, description, model) VALUES (
  'vehicle-extraction',
  'Main prompt for extracting vehicle data from PDF brochures',
  'gpt-4-1106-preview'
);

-- Insert version 1 of vehicle extraction prompt
INSERT INTO prompt_versions (
  prompt_id,
  version,
  system_prompt,
  user_prompt_template,
  model,
  temperature,
  max_tokens,
  response_format,
  changelog
)
SELECT 
  p.id,
  1,
  'You are a Danish vehicle leasing data extractor with a CRITICAL requirement: You MUST match extracted vehicles to the dealer''s existing inventory following MANDATORY VARIANT MATCHING RULES.

Your task is to parse car leasing brochures and return structured JSON, while STRICTLY following the 4-step variant matching process.

## MANDATORY VARIANT MATCHING PROCESS

**Step 1 (Match Existing):**
- For EVERY car in the brochure, FIRST check existing inventory (same make, model, ±5 HP)
- If match found → Copy the variant name EXACTLY, character for character
- NEVER modify existing variant names (don''t add/remove "Automatik", transmission suffixes, etc.)

**Step 2 (Standard Names):**
- If NO existing match → Use these EXACT standard names:
  TRANSMISSION: "Automatik" or "Manuel"
  EQUIPMENT: "Essential", "Select", "Style", "Advance", "Advanced", "Ultimate", "Business", "Experience", "Life", "Intens", "Intense", "Tech", "Techno", "Edition", "Plus", "Premium", "Signature", "Limited"
  EV RANGE: "Standard Range", "Long Range", "Extended Range"
  BATTERY: "58 kWh", "64 kWh", "77 kWh", "84 kWh", "99 kWh", "100 kWh"
  PATTERN: Always use "[Equipment]" or "[Equipment] – [Feature]"

**Step 3 (Dynamic Creation):**
- Only if specific variant isn''t in standard list → Create dynamic name
- Must follow pattern: "[Equipment Level] – [Distinguishing Feature]"
- Equipment separator MUST be " – " (space-dash-space)

**Step 4 (Deletion):**
- Mark ALL existing inventory items NOT found in brochure as deleted
- Set deletion_reason: "Not found in latest brochure"
- This ensures inventory matches current brochure exactly

## OUTPUT FORMAT

Return a JSON object with this structure:
{
  "vehicles": [
    {
      "make": "string",
      "model": "string",
      "variant": "string",
      "fuel_type": "Benzin|Diesel|El|Plugin-Hybrid|Hybrid|Mild-Hybrid",
      "transmission": "Automatik|Manuel",
      "hp": number,
      "equipment": "string",
      "offers": [
        [monthly_price, down_payment, months, km_per_year, total_price]
      ]
    }
  ],
  "deletions": [
    {
      "make": "string",
      "model": "string",
      "variant": "string",
      "reason": "Not found in latest brochure"
    }
  ]
}',
  '{{DEALER_CONTEXT}}
{{REFERENCE_DATA}}
{{EXISTING_LISTINGS}}

CRITICAL OFFERS ARRAY STRUCTURE:
The "offers" array must have EXACTLY 5 elements in this ORDER:
[
  monthly_price,    // Position 0: RECURRING monthly payment (2,000-8,000 kr typical)
  down_payment,     // Position 1: INITIAL payment/førstegangsydelse (0-50,000 kr)
  months,           // Position 2: Contract duration (12, 24, 36, 48)
  km_per_year,      // Position 3: Annual mileage (10000, 15000, 20000, 25000, 30000)
  total_price       // Position 4: Total cost (optional, can be null)
]

⚠️ COMMON MISTAKES TO AVOID:
- If monthly price is >10,000 kr, it''s probably the down payment by mistake
- Danish tables often show same monthly price with different down payments
- "Førstegangsydelse" = down payment (NOT monthly price!)

PDF Text:
{{PDF_TEXT}}

Extraction Instructions:
{{EXTRACTION_INSTRUCTIONS}}',
  'gpt-4-1106-preview',
  0.1,
  16000,
  '{"type": "json_object"}',
  'Initial version - moved from OpenAI stored prompts'
FROM prompts p
WHERE p.name = 'vehicle-extraction';

-- Function to get the latest prompt version
CREATE OR REPLACE FUNCTION get_latest_prompt_version(prompt_name VARCHAR)
RETURNS TABLE (
  prompt_id UUID,
  version INTEGER,
  system_prompt TEXT,
  user_prompt_template TEXT,
  model VARCHAR,
  temperature DECIMAL,
  max_tokens INTEGER,
  response_format JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pv.prompt_id,
    pv.version,
    pv.system_prompt,
    pv.user_prompt_template,
    pv.model,
    pv.temperature,
    pv.max_tokens,
    pv.response_format
  FROM prompt_versions pv
  JOIN prompts p ON p.id = pv.prompt_id
  WHERE p.name = prompt_name
    AND p.active = true
  ORDER BY pv.version DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to create a new prompt version
CREATE OR REPLACE FUNCTION create_prompt_version(
  p_prompt_name VARCHAR,
  p_system_prompt TEXT,
  p_user_prompt_template TEXT,
  p_changelog TEXT DEFAULT NULL,
  p_model VARCHAR DEFAULT 'gpt-4-1106-preview',
  p_temperature DECIMAL DEFAULT 0.1,
  p_max_tokens INTEGER DEFAULT 16000
)
RETURNS INTEGER AS $$
DECLARE
  v_prompt_id UUID;
  v_new_version INTEGER;
BEGIN
  -- Get prompt ID
  SELECT id INTO v_prompt_id FROM prompts WHERE name = p_prompt_name;
  
  IF v_prompt_id IS NULL THEN
    RAISE EXCEPTION 'Prompt % not found', p_prompt_name;
  END IF;
  
  -- Get next version number
  SELECT COALESCE(MAX(version), 0) + 1 INTO v_new_version
  FROM prompt_versions
  WHERE prompt_id = v_prompt_id;
  
  -- Insert new version
  INSERT INTO prompt_versions (
    prompt_id,
    version,
    system_prompt,
    user_prompt_template,
    model,
    temperature,
    max_tokens,
    changelog
  ) VALUES (
    v_prompt_id,
    v_new_version,
    p_system_prompt,
    p_user_prompt_template,
    p_model,
    p_temperature,
    p_max_tokens,
    p_changelog
  );
  
  -- Update prompt updated_at
  UPDATE prompts SET updated_at = NOW() WHERE id = v_prompt_id;
  
  RETURN v_new_version;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON prompts TO service_role;
GRANT SELECT ON prompt_versions TO service_role;
GRANT EXECUTE ON FUNCTION get_latest_prompt_version TO service_role;
GRANT EXECUTE ON FUNCTION create_prompt_version TO service_role;