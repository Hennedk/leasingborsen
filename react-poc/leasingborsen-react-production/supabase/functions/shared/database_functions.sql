-- Database functions for pattern learning intelligence

-- Function to get comprehensive pattern metrics
CREATE OR REPLACE FUNCTION get_pattern_metrics()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  WITH pattern_stats AS (
    SELECT 
      COUNT(*) as total_patterns,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as active_patterns,
      COUNT(CASE WHEN status = 'testing' THEN 1 END) as testing_patterns,
      COUNT(CASE WHEN status = 'retired' THEN 1 END) as retired_patterns,
      AVG(CASE WHEN status = 'active' THEN success_rate END) as avg_success_rate
    FROM pattern_learning
  ),
  top_patterns AS (
    SELECT 
      pa.field,
      pa.pattern,
      pa.success_rate,
      pa.usage_count
    FROM pattern_analytics pa
    WHERE pa.status = 'active'
    ORDER BY pa.success_rate DESC, pa.usage_count DESC
    LIMIT 5
  ),
  underperforming_patterns AS (
    SELECT 
      pa.field,
      pa.pattern,
      pa.success_rate,
      pa.usage_count
    FROM pattern_analytics pa
    WHERE pa.status = 'active' AND pa.success_rate < 0.7
    ORDER BY pa.success_rate ASC
    LIMIT 5
  ),
  recent_changes AS (
    SELECT 
      dealer_id,
      field,
      change_type,
      detected_at
    FROM format_change_logs
    WHERE resolved = FALSE
    ORDER BY detected_at DESC
    LIMIT 10
  )
  SELECT JSON_BUILD_OBJECT(
    'totalPatterns', ps.total_patterns,
    'activePatterns', ps.active_patterns,
    'testingPatterns', ps.testing_patterns,
    'retiredPatterns', ps.retired_patterns,
    'averageSuccessRate', COALESCE(ps.avg_success_rate, 0),
    'topPerformingPatterns', (
      SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
          'field', tp.field,
          'pattern', tp.pattern,
          'success_rate', tp.success_rate,
          'usage_count', tp.usage_count
        )
      ) FROM top_patterns tp
    ),
    'underperformingPatterns', (
      SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
          'field', up.field,
          'pattern', up.pattern,
          'success_rate', up.success_rate,
          'usage_count', up.usage_count
        )
      ) FROM underperforming_patterns up
    ),
    'recentFormatChanges', (
      SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
          'dealer_id', rc.dealer_id,
          'field', rc.field,
          'change_type', rc.change_type,
          'detected_at', rc.detected_at
        )
      ) FROM recent_changes rc
    )
  ) INTO result
  FROM pattern_stats ps;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to analyze pattern discovery trends
CREATE OR REPLACE FUNCTION analyze_discovery_trends(
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  discovery_date DATE,
  field VARCHAR(50),
  total_discoveries BIGINT,
  promoted_discoveries BIGINT,
  avg_confidence DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(pd.discovered_at) as discovery_date,
    pd.field,
    COUNT(*) as total_discoveries,
    COUNT(CASE WHEN pd.promoted THEN 1 END) as promoted_discoveries,
    AVG(pd.confidence) as avg_confidence
  FROM pattern_discoveries pd
  WHERE pd.discovered_at >= NOW() - INTERVAL '1 day' * days_back
  GROUP BY DATE(pd.discovered_at), pd.field
  ORDER BY discovery_date DESC, field;
END;
$$ LANGUAGE plpgsql;

-- Function to get field learning effectiveness
CREATE OR REPLACE FUNCTION get_field_learning_effectiveness()
RETURNS TABLE (
  field VARCHAR(50),
  total_patterns INTEGER,
  active_patterns INTEGER,
  avg_success_rate DECIMAL,
  total_discoveries BIGINT,
  recent_discoveries BIGINT,
  learning_velocity DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH pattern_stats AS (
    SELECT 
      pl.field,
      COUNT(*) as total_patterns,
      COUNT(CASE WHEN pl.status = 'active' THEN 1 END) as active_patterns,
      AVG(pl.success_rate) as avg_success_rate
    FROM pattern_learning pl
    GROUP BY pl.field
  ),
  discovery_stats AS (
    SELECT 
      pd.field,
      COUNT(*) as total_discoveries,
      COUNT(CASE WHEN pd.discovered_at >= NOW() - INTERVAL '7 days' THEN 1 END) as recent_discoveries
    FROM pattern_discoveries pd
    GROUP BY pd.field
  )
  SELECT 
    COALESCE(ps.field, ds.field) as field,
    COALESCE(ps.total_patterns, 0)::INTEGER as total_patterns,
    COALESCE(ps.active_patterns, 0)::INTEGER as active_patterns,
    COALESCE(ps.avg_success_rate, 0) as avg_success_rate,
    COALESCE(ds.total_discoveries, 0) as total_discoveries,
    COALESCE(ds.recent_discoveries, 0) as recent_discoveries,
    CASE 
      WHEN COALESCE(ds.total_discoveries, 0) > 0 
      THEN COALESCE(ds.recent_discoveries, 0)::DECIMAL / COALESCE(ds.total_discoveries, 1)
      ELSE 0
    END as learning_velocity
  FROM pattern_stats ps
  FULL OUTER JOIN discovery_stats ds ON ps.field = ds.field
  ORDER BY avg_success_rate DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to simulate pattern performance
CREATE OR REPLACE FUNCTION simulate_pattern_performance(
  test_pattern TEXT,
  test_field VARCHAR(50),
  sample_size INTEGER DEFAULT 100
)
RETURNS TABLE (
  success_rate DECIMAL,
  confidence_score DECIMAL,
  estimated_improvement DECIMAL
) AS $$
DECLARE
  current_avg_success DECIMAL;
BEGIN
  -- Get current average success rate for the field
  SELECT AVG(pl.success_rate) INTO current_avg_success
  FROM pattern_learning pl
  WHERE pl.field = test_field AND pl.status = 'active';
  
  -- For simulation, we'll use a simplified model
  -- In practice, this would test against historical extraction data
  RETURN QUERY
  SELECT 
    0.75::DECIMAL as success_rate, -- Simulated success rate
    0.80::DECIMAL as confidence_score, -- Simulated confidence
    (0.75 - COALESCE(current_avg_success, 0.5))::DECIMAL as estimated_improvement;
END;
$$ LANGUAGE plpgsql;

-- Function to get pattern recommendations
CREATE OR REPLACE FUNCTION get_pattern_recommendations(
  min_impact_threshold DECIMAL DEFAULT 0.1
)
RETURNS TABLE (
  recommendation_type TEXT,
  field VARCHAR(50),
  current_performance DECIMAL,
  suggested_action TEXT,
  expected_improvement DECIMAL,
  priority INTEGER
) AS $$
BEGIN
  -- Recommendations for underperforming fields
  RETURN QUERY
  WITH field_performance AS (
    SELECT 
      pl.field,
      AVG(pl.success_rate) as avg_success_rate,
      COUNT(*) as pattern_count
    FROM pattern_learning pl
    WHERE pl.status = 'active'
    GROUP BY pl.field
  ),
  discovery_opportunities AS (
    SELECT 
      pd.field,
      COUNT(*) as discovery_count,
      AVG(pd.confidence) as avg_confidence
    FROM pattern_discoveries pd
    WHERE pd.promoted = FALSE
    GROUP BY pd.field
    HAVING COUNT(*) >= 5
  )
  SELECT 
    'improve_field'::TEXT as recommendation_type,
    fp.field,
    fp.avg_success_rate as current_performance,
    CASE 
      WHEN fp.avg_success_rate < 0.6 THEN 'Review and update existing patterns'
      WHEN fp.avg_success_rate < 0.8 THEN 'Consider additional training data'
      ELSE 'Fine-tune confidence thresholds'
    END as suggested_action,
    CASE 
      WHEN fp.avg_success_rate < 0.6 THEN 0.3
      WHEN fp.avg_success_rate < 0.8 THEN 0.15
      ELSE 0.05
    END as expected_improvement,
    CASE 
      WHEN fp.avg_success_rate < 0.6 THEN 1
      WHEN fp.avg_success_rate < 0.8 THEN 2
      ELSE 3
    END as priority
  FROM field_performance fp
  WHERE fp.avg_success_rate < 0.9
  
  UNION ALL
  
  SELECT 
    'new_pattern'::TEXT as recommendation_type,
    do.field,
    0::DECIMAL as current_performance,
    'Promote discovered patterns to testing' as suggested_action,
    (do.avg_confidence - 0.5) as expected_improvement,
    CASE 
      WHEN do.discovery_count >= 20 THEN 1
      WHEN do.discovery_count >= 10 THEN 2
      ELSE 3
    END as priority
  FROM discovery_opportunities do
  WHERE do.avg_confidence > 0.7
  
  ORDER BY priority, expected_improvement DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old discoveries
CREATE OR REPLACE FUNCTION cleanup_old_discoveries(
  days_to_keep INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM pattern_discoveries
  WHERE discovered_at < NOW() - INTERVAL '1 day' * days_to_keep
    AND promoted = TRUE;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to archive retired patterns
CREATE OR REPLACE FUNCTION archive_retired_patterns()
RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  -- Create archive table if it doesn't exist
  CREATE TABLE IF NOT EXISTS pattern_learning_archive (
    LIKE pattern_learning INCLUDING ALL
  );
  
  -- Move retired patterns to archive
  WITH retired_patterns AS (
    DELETE FROM pattern_learning
    WHERE status = 'retired' 
      AND updated_at < NOW() - INTERVAL '30 days'
    RETURNING *
  )
  INSERT INTO pattern_learning_archive
  SELECT * FROM retired_patterns;
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  
  RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get learning statistics
CREATE OR REPLACE FUNCTION get_learning_statistics(
  start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  WITH stats AS (
    SELECT 
      COUNT(DISTINCT pd.field) as fields_with_discoveries,
      COUNT(*) as total_discoveries,
      COUNT(CASE WHEN pd.promoted THEN 1 END) as promoted_discoveries,
      AVG(pd.confidence) as avg_discovery_confidence,
      COUNT(DISTINCT ef.extraction_id) as extractions_with_feedback,
      AVG(CASE WHEN ef.is_correct THEN 1.0 ELSE 0.0 END) as overall_accuracy
    FROM pattern_discoveries pd
    LEFT JOIN extraction_feedback ef ON DATE(ef.feedback_date) BETWEEN start_date AND end_date
    WHERE DATE(pd.discovered_at) BETWEEN start_date AND end_date
  ),
  improvement_stats AS (
    SELECT 
      pl.field,
      pl.success_rate,
      LAG(pl.success_rate) OVER (PARTITION BY pl.field ORDER BY pl.updated_at) as previous_success_rate
    FROM pattern_learning pl
    WHERE pl.updated_at BETWEEN start_date AND end_date + INTERVAL '1 day'
  )
  SELECT JSON_BUILD_OBJECT(
    'period', JSON_BUILD_OBJECT(
      'start_date', start_date,
      'end_date', end_date
    ),
    'discoveries', JSON_BUILD_OBJECT(
      'fields_with_discoveries', s.fields_with_discoveries,
      'total_discoveries', s.total_discoveries,
      'promoted_discoveries', s.promoted_discoveries,
      'promotion_rate', CASE 
        WHEN s.total_discoveries > 0 
        THEN s.promoted_discoveries::DECIMAL / s.total_discoveries 
        ELSE 0 
      END,
      'avg_discovery_confidence', COALESCE(s.avg_discovery_confidence, 0)
    ),
    'feedback', JSON_BUILD_OBJECT(
      'extractions_with_feedback', COALESCE(s.extractions_with_feedback, 0),
      'overall_accuracy', COALESCE(s.overall_accuracy, 0)
    ),
    'improvements', (
      SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
          'field', field,
          'current_success_rate', success_rate,
          'improvement', success_rate - COALESCE(previous_success_rate, 0)
        )
      )
      FROM improvement_stats
      WHERE previous_success_rate IS NOT NULL
        AND success_rate - previous_success_rate > 0.05
    )
  ) INTO result
  FROM stats s;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_pattern_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_discovery_trends(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_field_learning_effectiveness() TO authenticated;
GRANT EXECUTE ON FUNCTION simulate_pattern_performance(TEXT, VARCHAR, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pattern_recommendations(DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION get_learning_statistics(DATE, DATE) TO authenticated;

-- Admin-only functions
GRANT EXECUTE ON FUNCTION cleanup_old_discoveries(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION archive_retired_patterns() TO service_role;