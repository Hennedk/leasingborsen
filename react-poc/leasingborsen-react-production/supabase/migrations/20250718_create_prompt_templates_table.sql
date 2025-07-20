-- Create prompt_templates table to store system prompts
CREATE TABLE IF NOT EXISTS prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id VARCHAR(255) UNIQUE NOT NULL,
  config_name VARCHAR(255) NOT NULL,
  system_prompt TEXT NOT NULL,
  model VARCHAR(100) NOT NULL DEFAULT 'gpt-4-1106-preview',
  temperature DECIMAL(3,2) NOT NULL DEFAULT 0.1,
  max_output_tokens INTEGER NOT NULL DEFAULT 16384,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX idx_prompt_templates_prompt_id ON prompt_templates(prompt_id);
CREATE INDEX idx_prompt_templates_config_name ON prompt_templates(config_name);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON prompt_templates TO service_role;