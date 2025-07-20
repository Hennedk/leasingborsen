-- Update Responses API configuration with correct prompt ID
-- IMPORTANT: Replace 'YOUR_OPENAI_PROMPT_ID_HERE' with the actual prompt ID from OpenAI Playground

-- First, let's check current configuration
SELECT name, openai_prompt_id, openai_prompt_version, active 
FROM responses_api_configs 
WHERE name = 'vehicle-extraction';

-- Update the prompt ID once you have created it in OpenAI Playground
-- Instructions:
-- 1. Go to OpenAI Playground (https://platform.openai.com/playground)
-- 2. Click on "Prompts" → "Create New"
-- 3. Copy the system prompt from responsesConfigManager.ts getSystemPromptTemplate() method
-- 4. Add a variable {contextMessage} for the dynamic content
-- 5. Publish the prompt and copy the prompt ID
-- 6. Replace 'YOUR_OPENAI_PROMPT_ID_HERE' below with the actual prompt ID

UPDATE responses_api_configs
SET 
  openai_prompt_id = 'YOUR_OPENAI_PROMPT_ID_HERE',  -- Replace with actual prompt ID
  openai_prompt_version = '1',  -- Update if needed
  updated_at = NOW()
WHERE name = 'vehicle-extraction';

-- Also update the config version history
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
  (SELECT COALESCE(MAX(version), 0) + 1 FROM config_versions WHERE config_id = c.id),
  'YOUR_OPENAI_PROMPT_ID_HERE',  -- Replace with actual prompt ID
  '1',
  model,
  temperature,
  max_completion_tokens,
  'Updated prompt ID to use actual OpenAI Playground prompt instead of invalid ID',
  'system'
FROM responses_api_configs c
WHERE name = 'vehicle-extraction';

-- Verify the update
SELECT name, openai_prompt_id, openai_prompt_version, updated_at 
FROM responses_api_configs 
WHERE name = 'vehicle-extraction';