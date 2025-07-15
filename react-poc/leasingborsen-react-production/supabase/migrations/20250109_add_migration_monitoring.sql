-- Migration monitoring tables for Responses API rollout

-- Create migration metrics table
CREATE TABLE IF NOT EXISTS migration_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  api_version text NOT NULL CHECK (api_version IN ('chat-completions', 'responses-api')),
  variant_source text CHECK (variant_source IN ('existing', 'reference', 'inferred', 'mixed')),
  confidence_score decimal(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  dealer_id uuid REFERENCES sellers(id),
  session_id uuid REFERENCES extraction_sessions(id),
  tokens_used integer DEFAULT 0,
  processing_time_ms integer,
  error_occurred boolean DEFAULT false,
  error_message text,
  
  -- Additional metrics
  inference_rate decimal(3,2),
  variant_distribution jsonb,
  
  -- Indexes
  INDEX idx_migration_metrics_created_at (created_at DESC),
  INDEX idx_migration_metrics_dealer_id (dealer_id),
  INDEX idx_migration_metrics_api_version (api_version)
);

-- Create view for variant source distribution
CREATE VIEW variant_source_distribution AS
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  api_version,
  COUNT(*) as total_extractions,
  AVG(inference_rate) as avg_inference_rate,
  AVG(confidence_score) as avg_confidence,
  SUM(tokens_used) as total_tokens,
  AVG(processing_time_ms) as avg_processing_time,
  COUNT(*) FILTER (WHERE error_occurred = true) as error_count,
  jsonb_build_object(
    'existing', COALESCE(AVG((variant_distribution->>'existing')::numeric), 0),
    'reference', COALESCE(AVG((variant_distribution->>'reference')::numeric), 0),
    'inferred', COALESCE(AVG((variant_distribution->>'inferred')::numeric), 0)
  ) as avg_variant_distribution
FROM migration_metrics
GROUP BY DATE_TRUNC('hour', created_at), api_version
ORDER BY hour DESC;

-- Create view for dealer-specific migration metrics
CREATE VIEW dealer_migration_metrics AS
SELECT 
  d.id as dealer_id,
  d.name as dealer_name,
  COUNT(DISTINCT m.id) as total_extractions,
  COUNT(DISTINCT m.id) FILTER (WHERE m.api_version = 'responses-api') as responses_api_count,
  COUNT(DISTINCT m.id) FILTER (WHERE m.api_version = 'chat-completions') as chat_completions_count,
  AVG(m.inference_rate) FILTER (WHERE m.api_version = 'responses-api') as avg_inference_rate,
  AVG(m.confidence_score) FILTER (WHERE m.api_version = 'responses-api') as avg_confidence,
  SUM(m.tokens_used) as total_tokens_used,
  COUNT(*) FILTER (WHERE m.error_occurred = true) as error_count,
  MAX(m.created_at) as last_extraction_at
FROM sellers d
LEFT JOIN migration_metrics m ON d.id = m.dealer_id
GROUP BY d.id, d.name
ORDER BY total_extractions DESC;

-- Add variant tracking fields to extraction_sessions table
ALTER TABLE extraction_sessions 
ADD COLUMN IF NOT EXISTS api_version text DEFAULT 'chat-completions',
ADD COLUMN IF NOT EXISTS inference_rate decimal(3,2),
ADD COLUMN IF NOT EXISTS variant_source_stats jsonb;

-- Add variant tracking fields to extraction_listing_changes table
ALTER TABLE extraction_listing_changes
ADD COLUMN IF NOT EXISTS variant_source text,
ADD COLUMN IF NOT EXISTS variant_confidence decimal(3,2),
ADD COLUMN IF NOT EXISTS variant_match_details jsonb;

-- Create function to get migration dashboard data
CREATE OR REPLACE FUNCTION get_migration_dashboard_data(
  start_date timestamptz DEFAULT now() - interval '24 hours',
  end_date timestamptz DEFAULT now()
)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'summary', (
      SELECT jsonb_build_object(
        'total_extractions', COUNT(*),
        'responses_api_count', COUNT(*) FILTER (WHERE api_version = 'responses-api'),
        'chat_completions_count', COUNT(*) FILTER (WHERE api_version = 'chat-completions'),
        'avg_inference_rate', AVG(inference_rate) FILTER (WHERE api_version = 'responses-api'),
        'total_errors', COUNT(*) FILTER (WHERE error_occurred = true),
        'avg_processing_time_ms', AVG(processing_time_ms),
        'total_tokens_used', SUM(tokens_used)
      )
      FROM migration_metrics
      WHERE created_at BETWEEN start_date AND end_date
    ),
    'hourly_metrics', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'hour', hour,
          'api_version', api_version,
          'count', total_extractions,
          'avg_inference_rate', avg_inference_rate,
          'avg_processing_time', avg_processing_time
        )
        ORDER BY hour DESC
      )
      FROM variant_source_distribution
      WHERE hour BETWEEN start_date AND end_date
    ),
    'top_inferred_variants', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'variant', extracted_data->>'variant',
          'make', extracted_data->>'make',
          'model', extracted_data->>'model',
          'count', count,
          'dealers', dealer_count
        )
        ORDER BY count DESC
        LIMIT 20
      )
      FROM (
        SELECT 
          extracted_data->>'variant',
          extracted_data->>'make', 
          extracted_data->>'model',
          COUNT(*) as count,
          COUNT(DISTINCT s.seller_id) as dealer_count
        FROM extraction_listing_changes elc
        JOIN extraction_sessions s ON elc.session_id = s.id
        WHERE elc.variant_source = 'inferred'
          AND elc.created_at BETWEEN start_date AND end_date
        GROUP BY 1, 2, 3
      ) t
    ),
    'dealer_rollout_status', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'dealer_id', dealer_id,
          'dealer_name', dealer_name,
          'status', CASE 
            WHEN responses_api_count > 0 AND chat_completions_count = 0 THEN 'fully_migrated'
            WHEN responses_api_count > 0 AND chat_completions_count > 0 THEN 'partial_rollout'
            ELSE 'not_migrated'
          END,
          'avg_inference_rate', avg_inference_rate,
          'total_extractions', total_extractions
        )
        ORDER BY total_extractions DESC
      )
      FROM dealer_migration_metrics
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create alert function for high inference rates
CREATE OR REPLACE FUNCTION check_inference_rate_alert()
RETURNS TABLE(
  alert_type text,
  severity text,
  message text,
  details jsonb
) AS $$
BEGIN
  -- Check overall inference rate
  IF EXISTS (
    SELECT 1
    FROM variant_source_distribution
    WHERE hour >= now() - interval '1 hour'
      AND api_version = 'responses-api'
      AND avg_inference_rate > 0.20
  ) THEN
    RETURN QUERY
    SELECT 
      'high_inference_rate'::text,
      'warning'::text,
      'Inference rate exceeds 20% threshold'::text,
      jsonb_build_object(
        'current_rate', avg_inference_rate,
        'threshold', 0.20,
        'hour', hour
      )
    FROM variant_source_distribution
    WHERE hour >= now() - interval '1 hour'
      AND api_version = 'responses-api'
      AND avg_inference_rate > 0.20
    ORDER BY hour DESC
    LIMIT 1;
  END IF;
  
  -- Check for high error rates
  IF EXISTS (
    SELECT 1
    FROM (
      SELECT 
        COUNT(*) FILTER (WHERE error_occurred = true) as error_count,
        COUNT(*) as total_count
      FROM migration_metrics
      WHERE created_at >= now() - interval '1 hour'
        AND api_version = 'responses-api'
    ) t
    WHERE total_count > 0 AND error_count::float / total_count > 0.01
  ) THEN
    RETURN QUERY
    SELECT 
      'high_error_rate'::text,
      'critical'::text,
      'Error rate exceeds 1% threshold'::text,
      jsonb_build_object(
        'error_count', error_count,
        'total_count', total_count,
        'error_rate', error_count::float / total_count
      )
    FROM (
      SELECT 
        COUNT(*) FILTER (WHERE error_occurred = true) as error_count,
        COUNT(*) as total_count
      FROM migration_metrics
      WHERE created_at >= now() - interval '1 hour'
        AND api_version = 'responses-api'
    ) t;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON migration_metrics TO authenticated;
GRANT SELECT ON variant_source_distribution TO authenticated;
GRANT SELECT ON dealer_migration_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_migration_dashboard_data TO authenticated;
GRANT EXECUTE ON FUNCTION check_inference_rate_alert TO authenticated;

-- Add RLS policies
ALTER TABLE migration_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage migration metrics"
  ON migration_metrics
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view migration metrics"
  ON migration_metrics
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Add comment
COMMENT ON TABLE migration_metrics IS 'Tracks metrics for the Responses API migration including variant source distribution and performance data';