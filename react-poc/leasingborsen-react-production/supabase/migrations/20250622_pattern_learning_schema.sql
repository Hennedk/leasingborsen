-- Pattern Learning Database Schema
-- This migration creates the database structure for the pattern learning engine

-- Table to store learned patterns
CREATE TABLE IF NOT EXISTS pattern_learning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern TEXT NOT NULL,
  field VARCHAR(50) NOT NULL,
  success_rate DECIMAL(3,2) DEFAULT 0.0,
  usage_count INTEGER DEFAULT 0,
  confidence_threshold DECIMAL(3,2) DEFAULT 0.7,
  examples TEXT[] DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'testing' CHECK (status IN ('active', 'testing', 'retired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(pattern, field)
);

-- Table to track pattern performance metrics
CREATE TABLE IF NOT EXISTS pattern_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id UUID REFERENCES pattern_learning(id) ON DELETE CASCADE,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  avg_confidence DECIMAL(3,2) DEFAULT 0.0,
  last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(pattern_id)
);

-- Table to store discovered patterns before promotion
CREATE TABLE IF NOT EXISTS pattern_discoveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern TEXT NOT NULL,
  field VARCHAR(50) NOT NULL,
  example TEXT NOT NULL,
  discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  extraction_id UUID,
  dealer_id UUID,
  confidence DECIMAL(3,2) DEFAULT 0.0,
  promoted BOOLEAN DEFAULT FALSE
);

-- Table to store extraction feedback for learning
CREATE TABLE IF NOT EXISTS extraction_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extraction_id UUID NOT NULL,
  field VARCHAR(50) NOT NULL,
  extracted_value TEXT,
  corrected_value TEXT,
  is_correct BOOLEAN NOT NULL,
  pattern_used TEXT,
  confidence DECIMAL(3,2) DEFAULT 0.0,
  feedback_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

-- Table to log format changes for monitoring
CREATE TABLE IF NOT EXISTS format_change_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID,
  field VARCHAR(50) NOT NULL,
  change_type VARCHAR(20) NOT NULL CHECK (change_type IN ('missing_field', 'new_field', 'format_change', 'pattern_failure')),
  description TEXT,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  resolution_notes TEXT
);

-- Table to store learning examples for training
CREATE TABLE IF NOT EXISTS learning_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field VARCHAR(50) NOT NULL,
  context TEXT NOT NULL,
  extracted_value TEXT NOT NULL,
  pattern_used TEXT,
  confidence DECIMAL(3,2) DEFAULT 0.0,
  success BOOLEAN NOT NULL,
  dealer_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to track A/B testing results
CREATE TABLE IF NOT EXISTS pattern_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_name VARCHAR(100) NOT NULL,
  field VARCHAR(50) NOT NULL,
  original_pattern TEXT,
  new_pattern TEXT NOT NULL,
  test_size INTEGER NOT NULL,
  original_success_rate DECIMAL(3,2),
  new_success_rate DECIMAL(3,2),
  improvement DECIMAL(3,2),
  recommendation VARCHAR(20) CHECK (recommendation IN ('adopt', 'reject', 'needs_more_data')),
  status VARCHAR(20) DEFAULT 'running' CHECK (status IN ('running', 'completed', 'cancelled')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pattern_learning_field ON pattern_learning(field);
CREATE INDEX IF NOT EXISTS idx_pattern_learning_status ON pattern_learning(status);
CREATE INDEX IF NOT EXISTS idx_pattern_learning_success_rate ON pattern_learning(success_rate);
CREATE INDEX IF NOT EXISTS idx_pattern_discoveries_field ON pattern_discoveries(field);
CREATE INDEX IF NOT EXISTS idx_pattern_discoveries_promoted ON pattern_discoveries(promoted);
CREATE INDEX IF NOT EXISTS idx_extraction_feedback_field ON extraction_feedback(field);
CREATE INDEX IF NOT EXISTS idx_extraction_feedback_date ON extraction_feedback(feedback_date);
CREATE INDEX IF NOT EXISTS idx_format_change_logs_dealer ON format_change_logs(dealer_id);
CREATE INDEX IF NOT EXISTS idx_format_change_logs_date ON format_change_logs(detected_at);
CREATE INDEX IF NOT EXISTS idx_learning_examples_field ON learning_examples(field);
CREATE INDEX IF NOT EXISTS idx_learning_examples_success ON learning_examples(success);

-- Views for analytics and reporting
CREATE OR REPLACE VIEW pattern_analytics AS
SELECT 
  pl.id,
  pl.field,
  pl.pattern,
  pl.success_rate,
  pl.usage_count,
  pl.status,
  pp.success_count,
  pp.failure_count,
  pp.avg_confidence,
  pp.last_used,
  pl.created_at,
  pl.updated_at
FROM pattern_learning pl
LEFT JOIN pattern_performance pp ON pl.id = pp.pattern_id;

CREATE OR REPLACE VIEW field_performance_summary AS
SELECT 
  field,
  COUNT(*) as total_patterns,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_patterns,
  COUNT(CASE WHEN status = 'testing' THEN 1 END) as testing_patterns,
  COUNT(CASE WHEN status = 'retired' THEN 1 END) as retired_patterns,
  AVG(success_rate) as avg_success_rate,
  MAX(success_rate) as best_success_rate,
  MIN(success_rate) as worst_success_rate
FROM pattern_learning
GROUP BY field;

CREATE OR REPLACE VIEW discovery_trends AS
SELECT 
  field,
  DATE_TRUNC('day', discovered_at) as discovery_date,
  COUNT(*) as discoveries_count,
  COUNT(CASE WHEN promoted THEN 1 END) as promoted_count,
  AVG(confidence) as avg_confidence
FROM pattern_discoveries
GROUP BY field, DATE_TRUNC('day', discovered_at)
ORDER BY discovery_date DESC;

-- Functions for pattern analysis
CREATE OR REPLACE FUNCTION analyze_pattern_frequency(
  min_occurrences INTEGER DEFAULT 5
)
RETURNS TABLE (
  pattern TEXT,
  field VARCHAR(50),
  occurrence_count BIGINT,
  success_rate DECIMAL,
  examples TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pd.pattern,
    pd.field,
    COUNT(*) as occurrence_count,
    AVG(CASE WHEN ef.is_correct THEN 1.0 ELSE 0.0 END) as success_rate,
    ARRAY_AGG(DISTINCT pd.example) as examples
  FROM pattern_discoveries pd
  LEFT JOIN extraction_feedback ef ON ef.pattern_used = pd.pattern AND ef.field = pd.field
  WHERE pd.promoted = FALSE
  GROUP BY pd.pattern, pd.field
  HAVING COUNT(*) >= min_occurrences;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_learning_suggestions(
  min_confidence DECIMAL DEFAULT 0.6,
  min_occurrences INTEGER DEFAULT 5
)
RETURNS TABLE (
  suggestion_type TEXT,
  field VARCHAR(50),
  pattern TEXT,
  confidence DECIMAL,
  occurrence_count BIGINT,
  estimated_improvement DECIMAL,
  priority INTEGER
) AS $$
BEGIN
  -- Return high-frequency discovered patterns
  RETURN QUERY
  SELECT 
    'new_pattern'::TEXT as suggestion_type,
    pd.field,
    pd.pattern,
    AVG(pd.confidence) as confidence,
    COUNT(*) as occurrence_count,
    (AVG(pd.confidence) - COALESCE(pl_avg.avg_success_rate, 0.5)) as estimated_improvement,
    CASE 
      WHEN COUNT(*) >= min_occurrences * 3 THEN 1
      WHEN COUNT(*) >= min_occurrences * 2 THEN 2
      ELSE 3
    END as priority
  FROM pattern_discoveries pd
  LEFT JOIN (
    SELECT field, AVG(success_rate) as avg_success_rate
    FROM pattern_learning 
    WHERE status = 'active'
    GROUP BY field
  ) pl_avg ON pl_avg.field = pd.field
  WHERE pd.promoted = FALSE
    AND pd.confidence >= min_confidence
  GROUP BY pd.pattern, pd.field, pl_avg.avg_success_rate
  HAVING COUNT(*) >= min_occurrences
  ORDER BY priority, occurrence_count DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_pattern_performance(
  p_pattern_id UUID,
  p_success BOOLEAN,
  p_confidence DECIMAL DEFAULT 0.0
)
RETURNS VOID AS $$
BEGIN
  -- Update or insert performance record
  INSERT INTO pattern_performance (pattern_id, success_count, failure_count, avg_confidence, last_used)
  VALUES (
    p_pattern_id,
    CASE WHEN p_success THEN 1 ELSE 0 END,
    CASE WHEN p_success THEN 0 ELSE 1 END,
    p_confidence,
    NOW()
  )
  ON CONFLICT (pattern_id) DO UPDATE SET
    success_count = pattern_performance.success_count + CASE WHEN p_success THEN 1 ELSE 0 END,
    failure_count = pattern_performance.failure_count + CASE WHEN p_success THEN 0 ELSE 1 END,
    avg_confidence = (
      pattern_performance.avg_confidence * (pattern_performance.success_count + pattern_performance.failure_count) + p_confidence
    ) / (pattern_performance.success_count + pattern_performance.failure_count + 1),
    last_used = NOW();
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic updates
CREATE OR REPLACE FUNCTION update_pattern_learning_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pattern_learning_updated_at
  BEFORE UPDATE ON pattern_learning
  FOR EACH ROW
  EXECUTE FUNCTION update_pattern_learning_timestamp();

-- RLS Policies (if needed)
ALTER TABLE pattern_learning ENABLE ROW LEVEL SECURITY;
ALTER TABLE pattern_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE pattern_discoveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE format_change_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE pattern_ab_tests ENABLE ROW LEVEL SECURITY;

-- Basic policies for authenticated users
CREATE POLICY "Users can view all patterns" ON pattern_learning
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can view all performance data" ON pattern_performance
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert discoveries" ON pattern_discoveries
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can view discoveries" ON pattern_discoveries
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert feedback" ON extraction_feedback
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can view feedback" ON extraction_feedback
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can view format changes" ON format_change_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert format changes" ON format_change_logs
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can view learning examples" ON learning_examples
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert learning examples" ON learning_examples
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can view AB tests" ON pattern_ab_tests
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage AB tests" ON pattern_ab_tests
  FOR ALL TO authenticated USING (true);

-- Sample data for testing
INSERT INTO pattern_learning (pattern, field, success_rate, confidence_threshold, examples, status) VALUES
('Pris:\\s*([0-9]{1,3}(?:\\.[0-9]{3})*)', 'price', 0.85, 0.7, '{"125.000", "89.500", "234.000"}', 'active'),
('Km-stand:\\s*([0-9]{1,3}(?:\\.[0-9]{3})*)\\s*km', 'mileage', 0.92, 0.8, '{"45.000", "12.500", "78.900"}', 'active'),
('Første reg\\.:\\s*([0-9]{2}[-/.][0-9]{2}[-/.][0-9]{4})', 'first_registration', 0.78, 0.75, '{"01/01/2020", "15.03.2019", "22-12-2021"}', 'testing'),
('([A-Z][a-z]+\\s+[A-Z0-9][a-z0-9\\s]+)', 'make_model', 0.65, 0.6, '{"Audi A4", "BMW X3", "Mercedes C-Class"}', 'testing');

-- Insert corresponding performance data
INSERT INTO pattern_performance (pattern_id, success_count, failure_count, avg_confidence, last_used)
SELECT 
  id,
  FLOOR(RANDOM() * 50 + 10)::INTEGER,
  FLOOR(RANDOM() * 10 + 1)::INTEGER,
  success_rate + (RANDOM() - 0.5) * 0.1,
  NOW() - INTERVAL '1 day' * FLOOR(RANDOM() * 30)
FROM pattern_learning;

COMMIT;