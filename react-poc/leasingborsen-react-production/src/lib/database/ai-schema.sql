-- Database schema updates for AI-powered extraction system

-- Add AI tracking columns to batch_imports table
ALTER TABLE batch_imports 
ADD COLUMN IF NOT EXISTS extraction_method TEXT DEFAULT 'pattern',
ADD COLUMN IF NOT EXISTS ai_model TEXT,
ADD COLUMN IF NOT EXISTS ai_tokens_used INTEGER,
ADD COLUMN IF NOT EXISTS ai_cost DECIMAL(10, 4);

-- Create AI usage log table for detailed tracking
CREATE TABLE IF NOT EXISTS ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES batch_imports(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  tokens_used INTEGER NOT NULL,
  cost DECIMAL(10, 4) NOT NULL,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_batch_id ON ai_usage_log(batch_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_created_at ON ai_usage_log(created_at);
CREATE INDEX IF NOT EXISTS idx_batch_imports_extraction_method ON batch_imports(extraction_method);

-- Add comments for documentation
COMMENT ON COLUMN batch_imports.extraction_method IS 'Method used for data extraction: pattern, ai, or hybrid';
COMMENT ON COLUMN batch_imports.ai_model IS 'AI model used for extraction (e.g., gpt-3.5-turbo)';
COMMENT ON COLUMN batch_imports.ai_tokens_used IS 'Total tokens consumed by AI for this batch';
COMMENT ON COLUMN batch_imports.ai_cost IS 'Estimated cost in USD for AI processing';

COMMENT ON TABLE ai_usage_log IS 'Detailed log of AI API usage for cost tracking and analysis';
COMMENT ON COLUMN ai_usage_log.batch_id IS 'Reference to the batch that triggered this AI usage';
COMMENT ON COLUMN ai_usage_log.model IS 'AI model used (gpt-3.5-turbo, gpt-4, etc.)';
COMMENT ON COLUMN ai_usage_log.tokens_used IS 'Number of tokens consumed in this API call';
COMMENT ON COLUMN ai_usage_log.cost IS 'Actual cost in USD for this API call';
COMMENT ON COLUMN ai_usage_log.success IS 'Whether the AI extraction was successful';
COMMENT ON COLUMN ai_usage_log.error_message IS 'Error message if the AI extraction failed';

-- Create a view for monthly AI usage summary
CREATE OR REPLACE VIEW monthly_ai_usage AS
SELECT 
  DATE_TRUNC('month', created_at) as month,
  model,
  COUNT(*) as request_count,
  SUM(tokens_used) as total_tokens,
  SUM(cost) as total_cost,
  AVG(cost) as avg_cost_per_request,
  SUM(CASE WHEN success THEN 1 ELSE 0 END)::FLOAT / COUNT(*) as success_rate
FROM ai_usage_log 
GROUP BY DATE_TRUNC('month', created_at), model
ORDER BY month DESC, model;

COMMENT ON VIEW monthly_ai_usage IS 'Monthly summary of AI usage for cost monitoring and analysis';

-- Create a function to get current month AI spending
CREATE OR REPLACE FUNCTION get_current_month_ai_spending()
RETURNS DECIMAL(10, 4) AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(cost) 
     FROM ai_usage_log 
     WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())),
    0
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_current_month_ai_spending() IS 'Get total AI spending for the current month';

-- Example query to check if AI budget is exceeded
-- SELECT get_current_month_ai_spending() > 50.00 as budget_exceeded;