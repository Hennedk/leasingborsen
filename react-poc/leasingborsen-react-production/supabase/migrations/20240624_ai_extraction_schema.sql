-- AI Extraction Schema Updates
-- This migration adds support for AI-based PDF extraction tracking and metadata

-- 1. Add extraction metadata to listings table
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS extraction_method TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS extraction_confidence DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS ai_provider TEXT,
ADD COLUMN IF NOT EXISTS extraction_timestamp TIMESTAMP,
ADD COLUMN IF NOT EXISTS extraction_version TEXT;

-- Create index for filtering by extraction method
CREATE INDEX IF NOT EXISTS idx_listings_extraction_method ON listings(extraction_method);

-- 2. Create extraction logs table for tracking all extraction attempts
CREATE TABLE IF NOT EXISTS extraction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdf_url TEXT NOT NULL,
  pdf_hash TEXT, -- For duplicate detection
  dealer_name TEXT,
  dealer_id UUID REFERENCES sellers(id),
  extraction_status TEXT NOT NULL CHECK (extraction_status IN ('success', 'failed', 'partial')),
  ai_provider TEXT,
  model_version TEXT,
  tokens_input INTEGER,
  tokens_output INTEGER,
  cost_cents INTEGER NOT NULL DEFAULT 0,
  extracted_count INTEGER DEFAULT 0,
  processing_time_ms INTEGER,
  error_message TEXT,
  error_type TEXT,
  retry_count INTEGER DEFAULT 0,
  parent_log_id UUID REFERENCES extraction_logs(id), -- For retry tracking
  raw_response JSONB, -- Store raw AI response for debugging
  extracted_data JSONB, -- Store structured extraction result
  validation_errors JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_extraction_logs_dealer ON extraction_logs(dealer_id);
CREATE INDEX IF NOT EXISTS idx_extraction_logs_status ON extraction_logs(extraction_status);
CREATE INDEX IF NOT EXISTS idx_extraction_logs_created ON extraction_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_extraction_logs_pdf_hash ON extraction_logs(pdf_hash);
CREATE INDEX IF NOT EXISTS idx_extraction_logs_cost ON extraction_logs(cost_cents);

-- 3. Create cost tracking view for monitoring and budgeting
CREATE OR REPLACE VIEW extraction_cost_summary AS
SELECT 
  DATE(created_at) as date,
  dealer_name,
  ai_provider,
  COUNT(*) as extraction_count,
  SUM(extracted_count) as total_variants,
  SUM(cost_cents) / 100.0 as total_cost_usd,
  AVG(cost_cents) / 100.0 as avg_cost_per_pdf,
  SUM(CASE WHEN extraction_status = 'success' THEN 1 ELSE 0 END) as success_count,
  ROUND(100.0 * SUM(CASE WHEN extraction_status = 'success' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM extraction_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), dealer_name, ai_provider
ORDER BY date DESC;

-- 4. Create daily cost summary view
CREATE OR REPLACE VIEW daily_extraction_costs AS
SELECT 
  DATE(created_at) as date,
  COUNT(DISTINCT dealer_name) as dealers_processed,
  COUNT(*) as total_extractions,
  SUM(CASE WHEN extraction_status = 'success' THEN 1 ELSE 0 END) as successful_extractions,
  SUM(cost_cents) / 100.0 as total_cost_usd,
  MAX(cost_cents) / 100.0 as max_cost_per_pdf,
  AVG(cost_cents) / 100.0 as avg_cost_per_pdf,
  SUM(tokens_input + COALESCE(tokens_output, 0)) as total_tokens,
  AVG(processing_time_ms) as avg_processing_time_ms
FROM extraction_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 5. Create provider performance view
CREATE OR REPLACE VIEW provider_performance AS
SELECT 
  ai_provider,
  model_version,
  COUNT(*) as total_attempts,
  SUM(CASE WHEN extraction_status = 'success' THEN 1 ELSE 0 END) as successes,
  ROUND(100.0 * SUM(CASE WHEN extraction_status = 'success' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate,
  AVG(cost_cents) / 100.0 as avg_cost_usd,
  AVG(processing_time_ms) / 1000.0 as avg_processing_seconds,
  AVG(extracted_count) as avg_items_extracted,
  COUNT(DISTINCT dealer_name) as unique_dealers
FROM extraction_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY ai_provider, model_version
ORDER BY success_rate DESC, avg_cost_usd ASC;

-- 6. Function to check daily cost limit
CREATE OR REPLACE FUNCTION check_daily_extraction_cost_limit(limit_usd NUMERIC)
RETURNS BOOLEAN AS $$
DECLARE
  today_cost_cents INTEGER;
BEGIN
  SELECT COALESCE(SUM(cost_cents), 0) INTO today_cost_cents
  FROM extraction_logs
  WHERE DATE(created_at) = CURRENT_DATE;
  
  RETURN (today_cost_cents / 100.0) < limit_usd;
END;
$$ LANGUAGE plpgsql;

-- 7. Function to get extraction statistics for a dealer
CREATE OR REPLACE FUNCTION get_dealer_extraction_stats(p_dealer_id UUID)
RETURNS TABLE (
  total_extractions INTEGER,
  successful_extractions INTEGER,
  failed_extractions INTEGER,
  total_cost_usd NUMERIC,
  avg_cost_per_pdf NUMERIC,
  last_extraction_date TIMESTAMP,
  most_used_provider TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_extractions,
    SUM(CASE WHEN extraction_status = 'success' THEN 1 ELSE 0 END)::INTEGER as successful_extractions,
    SUM(CASE WHEN extraction_status = 'failed' THEN 1 ELSE 0 END)::INTEGER as failed_extractions,
    ROUND(SUM(cost_cents) / 100.0, 2) as total_cost_usd,
    ROUND(AVG(cost_cents) / 100.0, 2) as avg_cost_per_pdf,
    MAX(created_at) as last_extraction_date,
    MODE() WITHIN GROUP (ORDER BY ai_provider) as most_used_provider
  FROM extraction_logs
  WHERE dealer_id = p_dealer_id;
END;
$$ LANGUAGE plpgsql;

-- 8. RLS policies for extraction_logs
ALTER TABLE extraction_logs ENABLE ROW LEVEL SECURITY;

-- Policy for viewing extraction logs (admin only)
CREATE POLICY extraction_logs_view_policy ON extraction_logs
  FOR SELECT
  USING (auth.role() = 'admin' OR auth.role() = 'service_role');

-- Policy for inserting extraction logs (service role only)
CREATE POLICY extraction_logs_insert_policy ON extraction_logs
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- 9. Create trigger to update listings extraction metadata after successful extraction
CREATE OR REPLACE FUNCTION update_listing_extraction_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if extraction was successful and we have extracted data
  IF NEW.extraction_status = 'success' AND NEW.extracted_data IS NOT NULL THEN
    -- Update all listings that match the extracted data
    UPDATE listings 
    SET 
      extraction_method = 'ai',
      extraction_confidence = (NEW.extracted_data->>'confidence')::DECIMAL(3,2),
      ai_provider = NEW.ai_provider,
      extraction_timestamp = NEW.created_at,
      extraction_version = NEW.model_version
    WHERE seller_id = NEW.dealer_id
      AND updated_at >= NEW.created_at - INTERVAL '1 hour';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER extraction_success_update_listings
  AFTER INSERT ON extraction_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_listing_extraction_metadata();

-- 10. Add comments for documentation
COMMENT ON TABLE extraction_logs IS 'Tracks all PDF extraction attempts with AI providers';
COMMENT ON COLUMN extraction_logs.pdf_hash IS 'SHA-256 hash of PDF content for duplicate detection';
COMMENT ON COLUMN extraction_logs.parent_log_id IS 'References the original extraction attempt if this is a retry';
COMMENT ON COLUMN extraction_logs.raw_response IS 'Complete AI provider response for debugging';
COMMENT ON COLUMN extraction_logs.extracted_data IS 'Structured data extracted from the PDF';
COMMENT ON VIEW extraction_cost_summary IS 'Summary of extraction costs by date, dealer, and provider';
COMMENT ON VIEW daily_extraction_costs IS 'Daily aggregated extraction costs and performance metrics';
COMMENT ON VIEW provider_performance IS 'Performance comparison between different AI providers';