-- AI Optimization Tables for Enhanced PDF Processing
-- These tables support the AIExtractionEngine's optimization features

-- Table for caching AI extraction results by text hash
CREATE TABLE IF NOT EXISTS ai_extraction_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  text_hash TEXT NOT NULL,
  dealer_id TEXT NOT NULL,
  config_version TEXT NOT NULL,
  result JSONB NOT NULL,
  confidence_score DECIMAL(4,3) NOT NULL,
  items_count INTEGER NOT NULL,
  extraction_method TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  hit_count INTEGER DEFAULT 0,
  success_rate DECIMAL(4,3) DEFAULT 1.0,
  
  -- Indexes for fast lookups
  UNIQUE(text_hash, dealer_id, config_version)
);

-- Index for cache lookups
CREATE INDEX IF NOT EXISTS idx_ai_cache_lookup 
ON ai_extraction_cache(text_hash, dealer_id, config_version, created_at DESC);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_ai_cache_cleanup 
ON ai_extraction_cache(created_at);

-- Table for tracking AI optimization metrics per dealer
CREATE TABLE IF NOT EXISTS ai_optimization_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_id TEXT NOT NULL,
  document_type TEXT DEFAULT 'general',
  success_rate DECIMAL(4,3) NOT NULL DEFAULT 0.0,
  average_confidence DECIMAL(4,3) NOT NULL DEFAULT 0.0,
  cost_efficiency DECIMAL(8,6) NOT NULL DEFAULT 0.0,
  total_extractions INTEGER DEFAULT 0,
  successful_extractions INTEGER DEFAULT 0,
  total_cost_usd DECIMAL(10,6) DEFAULT 0.0,
  last_optimized_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  prompt_version TEXT DEFAULT 'v1.0',
  performance_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(dealer_id, document_type)
);

-- Index for metrics lookups
CREATE INDEX IF NOT EXISTS idx_ai_metrics_dealer 
ON ai_optimization_metrics(dealer_id, last_optimized_at DESC);

-- Table for storing learned AI examples per dealer
CREATE TABLE IF NOT EXISTS ai_learned_examples (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_id TEXT NOT NULL,
  example_type TEXT DEFAULT 'successful_extraction',
  input_text TEXT NOT NULL,
  expected_output JSONB NOT NULL,
  confidence_score DECIMAL(4,3) NOT NULL,
  relevance_score DECIMAL(4,3) DEFAULT 1.0,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

-- Index for example lookups
CREATE INDEX IF NOT EXISTS idx_ai_examples_dealer 
ON ai_learned_examples(dealer_id, relevance_score DESC, last_used_at DESC);

-- Table for tracking AI budget usage
CREATE TABLE IF NOT EXISTS ai_budget_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_id TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_cost_usd DECIMAL(10,6) DEFAULT 0.0,
  total_tokens INTEGER DEFAULT 0,
  extraction_count INTEGER DEFAULT 0,
  average_cost_per_extraction DECIMAL(10,6) DEFAULT 0.0,
  budget_limit_usd DECIMAL(10,6) DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(dealer_id, date)
);

-- Index for budget lookups
CREATE INDEX IF NOT EXISTS idx_ai_budget_dealer_date 
ON ai_budget_tracking(dealer_id, date DESC);

-- Table for storing extraction feedback and learning data
CREATE TABLE IF NOT EXISTS ai_extraction_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  extraction_id UUID, -- Links to processing_jobs or specific extraction
  dealer_id TEXT NOT NULL,
  original_text_hash TEXT NOT NULL,
  ai_result JSONB NOT NULL,
  user_feedback TEXT, -- 'correct', 'incorrect', 'partially_correct'
  corrections JSONB, -- User corrections to improve learning
  feedback_confidence DECIMAL(4,3) DEFAULT 1.0,
  improvement_suggestions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_for_learning BOOLEAN DEFAULT FALSE
);

-- Index for feedback processing
CREATE INDEX IF NOT EXISTS idx_ai_feedback_learning 
ON ai_extraction_feedback(dealer_id, processed_for_learning, created_at DESC);

-- Function to increment cache hit count
CREATE OR REPLACE FUNCTION increment_cache_hit_count(text_hash TEXT)
RETURNS void AS $$
BEGIN
  UPDATE ai_extraction_cache 
  SET hit_count = hit_count + 1,
      success_rate = LEAST(1.0, success_rate + 0.01) -- Slight boost for frequent use
  WHERE ai_extraction_cache.text_hash = increment_cache_hit_count.text_hash;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old cache entries
CREATE OR REPLACE FUNCTION cleanup_ai_cache(older_than_hours INTEGER DEFAULT 168) -- 7 days default
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM ai_extraction_cache 
  WHERE created_at < NOW() - INTERVAL '1 hour' * older_than_hours;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update optimization metrics
CREATE OR REPLACE FUNCTION update_ai_optimization_metrics(
  p_dealer_id TEXT,
  p_confidence DECIMAL(4,3),
  p_cost DECIMAL(10,6),
  p_success BOOLEAN
)
RETURNS void AS $$
DECLARE
  current_metrics RECORD;
BEGIN
  -- Get current metrics
  SELECT * INTO current_metrics 
  FROM ai_optimization_metrics 
  WHERE dealer_id = p_dealer_id;
  
  IF FOUND THEN
    -- Update existing metrics
    UPDATE ai_optimization_metrics SET
      total_extractions = total_extractions + 1,
      successful_extractions = successful_extractions + CASE WHEN p_success THEN 1 ELSE 0 END,
      success_rate = (successful_extractions + CASE WHEN p_success THEN 1 ELSE 0 END)::DECIMAL / (total_extractions + 1),
      average_confidence = (average_confidence * total_extractions + p_confidence) / (total_extractions + 1),
      total_cost_usd = total_cost_usd + p_cost,
      cost_efficiency = CASE 
        WHEN total_cost_usd + p_cost > 0 
        THEN (successful_extractions + CASE WHEN p_success THEN 1 ELSE 0 END) / (total_cost_usd + p_cost)
        ELSE 0 
      END,
      updated_at = NOW()
    WHERE dealer_id = p_dealer_id;
  ELSE
    -- Create new metrics record
    INSERT INTO ai_optimization_metrics (
      dealer_id, 
      total_extractions, 
      successful_extractions, 
      success_rate, 
      average_confidence, 
      total_cost_usd, 
      cost_efficiency
    ) VALUES (
      p_dealer_id,
      1,
      CASE WHEN p_success THEN 1 ELSE 0 END,
      CASE WHEN p_success THEN 1.0 ELSE 0.0 END,
      p_confidence,
      p_cost,
      CASE WHEN p_cost > 0 AND p_success THEN 1.0 / p_cost ELSE 0 END
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create RLS policies for the new tables
ALTER TABLE ai_extraction_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_optimization_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_learned_examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_budget_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_extraction_feedback ENABLE ROW LEVEL SECURITY;

-- Allow service role to access all AI optimization tables
CREATE POLICY "Service role can manage AI cache" ON ai_extraction_cache
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage AI metrics" ON ai_optimization_metrics
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage AI examples" ON ai_learned_examples
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage AI budget" ON ai_budget_tracking
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage AI feedback" ON ai_extraction_feedback
  FOR ALL USING (auth.role() = 'service_role');

-- Add comments for documentation
COMMENT ON TABLE ai_extraction_cache IS 'Caches AI extraction results by text hash to avoid duplicate API calls and reduce costs';
COMMENT ON TABLE ai_optimization_metrics IS 'Tracks AI extraction performance metrics per dealer for optimization';
COMMENT ON TABLE ai_learned_examples IS 'Stores successful extraction examples for improving AI prompts';
COMMENT ON TABLE ai_budget_tracking IS 'Tracks daily AI API costs per dealer for budget management';
COMMENT ON TABLE ai_extraction_feedback IS 'Stores user feedback on AI extractions for continuous learning';

COMMENT ON FUNCTION increment_cache_hit_count(TEXT) IS 'Increments hit count for cached AI results';
COMMENT ON FUNCTION cleanup_ai_cache(INTEGER) IS 'Removes old AI cache entries to manage storage';
COMMENT ON FUNCTION update_ai_optimization_metrics(TEXT, DECIMAL, DECIMAL, BOOLEAN) IS 'Updates AI performance metrics for a dealer';