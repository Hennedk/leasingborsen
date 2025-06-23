-- Add processing jobs table for server-side PDF processing
-- This enables background job tracking with real-time progress updates

CREATE TABLE IF NOT EXISTS processing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES batch_imports(id) ON DELETE CASCADE,
  dealer_id text NOT NULL,
  file_url text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  current_step text,
  extraction_method text, -- 'cache', 'pattern', 'ai', 'hybrid'
  items_processed integer DEFAULT 0,
  confidence_score numeric(3,2),
  ai_cost numeric(8,4) DEFAULT 0,
  ai_tokens_used integer DEFAULT 0,
  error_message text,
  processing_start_time timestamptz,
  processing_end_time timestamptz,
  estimated_completion timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes for common queries
CREATE INDEX idx_processing_jobs_batch_id ON processing_jobs(batch_id);
CREATE INDEX idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX idx_processing_jobs_dealer_id ON processing_jobs(dealer_id);
CREATE INDEX idx_processing_jobs_created_at ON processing_jobs(created_at);

-- Add RLS policies
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own processing jobs
CREATE POLICY "Users can view processing jobs" ON processing_jobs
  FOR SELECT TO authenticated
  USING (true); -- For now, allow all authenticated users to see all jobs

-- Allow service role to insert/update processing jobs (for Edge Functions)
CREATE POLICY "Service role can manage processing jobs" ON processing_jobs
  FOR ALL TO service_role
  USING (true);

-- Add trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_processing_jobs_updated_at 
  BEFORE UPDATE ON processing_jobs 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add function to notify clients of job progress updates
CREATE OR REPLACE FUNCTION notify_job_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Send real-time notification via pg_notify
  PERFORM pg_notify(
    'job_progress_' || NEW.id::text,
    json_build_object(
      'id', NEW.id,
      'batch_id', NEW.batch_id,
      'status', NEW.status,
      'progress', NEW.progress,
      'current_step', NEW.current_step,
      'items_processed', NEW.items_processed,
      'estimated_completion', NEW.estimated_completion,
      'error_message', NEW.error_message
    )::text
  );
  
  -- Also send batch-level notification
  PERFORM pg_notify(
    'batch_progress_' || NEW.batch_id::text,
    json_build_object(
      'batch_id', NEW.batch_id,
      'job_id', NEW.id,
      'status', NEW.status,
      'progress', NEW.progress,
      'current_step', NEW.current_step
    )::text
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for real-time notifications
CREATE TRIGGER trigger_notify_job_progress
  AFTER INSERT OR UPDATE ON processing_jobs
  FOR EACH ROW
  EXECUTE FUNCTION notify_job_progress();

-- Add configuration table for dealer-specific settings
CREATE TABLE IF NOT EXISTS dealer_configs (
  id text PRIMARY KEY,
  name text NOT NULL,
  version text NOT NULL DEFAULT 'v1.0',
  config_data jsonb NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add RLS for dealer configs
ALTER TABLE dealer_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active dealer configs" ON dealer_configs
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Service role can manage dealer configs" ON dealer_configs
  FOR ALL TO service_role
  USING (true);

-- Add trigger for dealer configs updated_at
CREATE TRIGGER update_dealer_configs_updated_at 
  BEFORE UPDATE ON dealer_configs 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add extraction cache table for cost optimization
CREATE TABLE IF NOT EXISTS extraction_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_hash text NOT NULL,
  dealer_id text NOT NULL,
  config_version text NOT NULL,
  extraction_result jsonb NOT NULL,
  confidence_score numeric(3,2),
  extraction_method text NOT NULL,
  cache_hits integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  last_accessed timestamptz DEFAULT now()
);

-- Create unique index for cache lookups
CREATE UNIQUE INDEX idx_extraction_cache_lookup 
  ON extraction_cache(content_hash, dealer_id, config_version);

-- Add indexes for cache management
CREATE INDEX idx_extraction_cache_dealer_id ON extraction_cache(dealer_id);
CREATE INDEX idx_extraction_cache_last_accessed ON extraction_cache(last_accessed);

-- Add RLS for extraction cache
ALTER TABLE extraction_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage extraction cache" ON extraction_cache
  FOR ALL TO service_role
  USING (true);

-- Add AI usage tracking table for budget management
CREATE TABLE IF NOT EXISTS ai_usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  dealer_id text,
  batch_id uuid,
  job_id uuid,
  model_used text NOT NULL, -- 'gpt-3.5-turbo', 'gpt-4', etc.
  tokens_used integer NOT NULL,
  cost_usd numeric(8,4) NOT NULL,
  extraction_type text, -- 'full', 'pattern_supplement', 'validation'
  success boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for AI usage queries
CREATE INDEX idx_ai_usage_date ON ai_usage_tracking(date);
CREATE INDEX idx_ai_usage_dealer_date ON ai_usage_tracking(dealer_id, date);
CREATE INDEX idx_ai_usage_batch_id ON ai_usage_tracking(batch_id);

-- Add RLS for AI usage tracking
ALTER TABLE ai_usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage AI usage tracking" ON ai_usage_tracking
  FOR ALL TO service_role
  USING (true);

-- Allow authenticated users to view aggregated AI usage
CREATE POLICY "Users can view AI usage summaries" ON ai_usage_tracking
  FOR SELECT TO authenticated
  USING (true);

-- Add pattern performance tracking table for learning system
CREATE TABLE IF NOT EXISTS pattern_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id text NOT NULL,
  pattern_type text NOT NULL, -- 'model_header', 'price_line', etc.
  pattern_regex text NOT NULL,
  success_count integer DEFAULT 0,
  failure_count integer DEFAULT 0,
  average_confidence numeric(3,2),
  last_used timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create unique index for pattern tracking
CREATE UNIQUE INDEX idx_pattern_performance_lookup 
  ON pattern_performance(dealer_id, pattern_type, pattern_regex);

-- Add indexes for pattern queries
CREATE INDEX idx_pattern_performance_dealer ON pattern_performance(dealer_id);
CREATE INDEX idx_pattern_performance_success_rate 
  ON pattern_performance((success_count::float / NULLIF(success_count + failure_count, 0)) DESC);

-- Add RLS for pattern performance
ALTER TABLE pattern_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage pattern performance" ON pattern_performance
  FOR ALL TO service_role
  USING (true);

-- Add trigger for pattern performance updated_at
CREATE TRIGGER update_pattern_performance_updated_at 
  BEFORE UPDATE ON pattern_performance 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add helper function to get current month AI spending
CREATE OR REPLACE FUNCTION get_current_month_ai_spending()
RETURNS numeric AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(cost_usd) 
     FROM ai_usage_tracking 
     WHERE date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE)),
    0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add helper function to get daily AI spending
CREATE OR REPLACE FUNCTION get_daily_ai_spending(target_date date DEFAULT CURRENT_DATE)
RETURNS numeric AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(cost_usd) 
     FROM ai_usage_tracking 
     WHERE date = target_date),
    0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add helper function to check if AI budget is available
CREATE OR REPLACE FUNCTION check_ai_budget_available(daily_limit numeric DEFAULT 1.67)
RETURNS boolean AS $$
BEGIN
  RETURN get_daily_ai_spending() < daily_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE processing_jobs IS 'Tracks server-side PDF processing jobs with real-time progress updates';
COMMENT ON TABLE dealer_configs IS 'Stores dealer-specific configuration for PDF extraction patterns and rules';
COMMENT ON TABLE extraction_cache IS 'Caches PDF extraction results to reduce AI costs and improve performance';
COMMENT ON TABLE ai_usage_tracking IS 'Tracks AI API usage for cost monitoring and budget management';
COMMENT ON TABLE pattern_performance IS 'Tracks pattern matching performance for learning and optimization';

COMMENT ON FUNCTION get_current_month_ai_spending() IS 'Returns total AI spending for current month';
COMMENT ON FUNCTION get_daily_ai_spending(date) IS 'Returns total AI spending for specified date';
COMMENT ON FUNCTION check_ai_budget_available(numeric) IS 'Checks if daily AI budget limit has been reached';