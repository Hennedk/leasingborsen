#!/bin/bash

# Staging Database Deployment Script
# Deploys AI extraction schema and required tables to staging environment

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Load staging environment
if [ ! -f ".env.staging" ]; then
    error "Staging environment file .env.staging not found"
fi

source .env.staging

log "🗄️ Deploying Database Schema to Staging"
log "========================================"

# Validate required environment variables
if [ -z "$VITE_SUPABASE_URL" ]; then
    error "VITE_SUPABASE_URL not set in staging environment"
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    error "SUPABASE_SERVICE_ROLE_KEY not set in staging environment"
fi

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    warn "Supabase CLI not found. Installing..."
    npm install -g supabase
fi

log "Supabase CLI version: $(supabase --version)"

# Initialize Supabase project locally if needed
if [ ! -f "supabase/config.toml" ]; then
    log "Initializing Supabase project..."
    supabase init
fi

# Update Supabase configuration for staging
log "Configuring Supabase for staging environment..."
cat > supabase/config.toml << EOF
# Supabase local development configuration

[api]
enabled = true
port = 54321
schemas = ["public", "graphql_public"]
extra_search_path = ["public", "extensions"]
max_rows = 1000

[auth]
enabled = true
port = 54324
external_url = "http://localhost:54324"

[db]
port = 54322
shadow_port = 54320
major_version = 15

[studio]
enabled = true
port = 54323

[ingest]
enabled = false

[storage]
enabled = false

[edge_runtime]
enabled = true
port = 54325

# Staging-specific configuration
[staging]
project_id = "$(basename "$VITE_SUPABASE_URL" .supabase.co)"
db_url = "$VITE_SUPABASE_URL"
EOF

# Link to staging project
log "Linking to staging Supabase project..."
echo "$SUPABASE_SERVICE_ROLE_KEY" | supabase link --project-ref "$(basename "$VITE_SUPABASE_URL" .supabase.co)"

# Deploy AI extraction schema
log "Deploying AI extraction schema..."
if [ -f "supabase/migrations/20240624_ai_extraction_schema.sql" ]; then
    log "Applying AI extraction migration..."
    supabase db push
else
    warn "AI extraction schema file not found. Creating it..."
    
    # Create the migration file if it doesn't exist
    mkdir -p supabase/migrations
    cat > supabase/migrations/$(date +%Y%m%d%H%M%S)_ai_extraction_schema.sql << 'EOF'
-- AI Extraction Schema for Staging Environment
-- Creates tables for tracking AI extraction costs, performance, and logs

-- Create extension for UUID generation if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Extraction logs table for tracking all AI operations
CREATE TABLE IF NOT EXISTS extraction_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Request information
    pdf_url TEXT NOT NULL,
    dealer_name TEXT,
    request_id TEXT,
    
    -- Extraction details
    extraction_status TEXT NOT NULL CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed', 'timeout')),
    ai_provider TEXT CHECK (ai_provider IN ('openai', 'anthropic', 'mock')),
    model_version TEXT,
    
    -- Performance metrics
    processing_time_ms INTEGER,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    cost_cents INTEGER NOT NULL DEFAULT 0,
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    
    -- Results
    extracted_data JSONB,
    validation_errors JSONB,
    validation_warnings JSONB,
    
    -- Error handling
    error_type TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Metadata
    extraction_options JSONB,
    metadata JSONB
);

-- Cost tracking table for budget management
CREATE TABLE IF NOT EXISTS extraction_costs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Date and provider
    extraction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    ai_provider TEXT NOT NULL,
    
    -- Cost details
    total_extractions INTEGER NOT NULL DEFAULT 0,
    total_tokens_used INTEGER NOT NULL DEFAULT 0,
    total_cost_cents INTEGER NOT NULL DEFAULT 0,
    
    -- Aggregation metadata
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(extraction_date, ai_provider)
);

-- Performance metrics table
CREATE TABLE IF NOT EXISTS extraction_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Time period
    metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
    metric_hour INTEGER NOT NULL DEFAULT EXTRACT(hour FROM NOW()),
    ai_provider TEXT NOT NULL,
    
    -- Performance data
    total_extractions INTEGER NOT NULL DEFAULT 0,
    successful_extractions INTEGER NOT NULL DEFAULT 0,
    failed_extractions INTEGER NOT NULL DEFAULT 0,
    avg_processing_time_ms INTEGER,
    avg_confidence_score DECIMAL(3,2),
    
    -- Error analysis
    error_types JSONB,
    
    UNIQUE(metric_date, metric_hour, ai_provider)
);

-- Budget alerts table
CREATE TABLE IF NOT EXISTS budget_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Alert details
    alert_type TEXT NOT NULL CHECK (alert_type IN ('warning', 'critical', 'budget_exceeded')),
    alert_date DATE NOT NULL DEFAULT CURRENT_DATE,
    message TEXT NOT NULL,
    
    -- Cost information
    current_cost_cents INTEGER NOT NULL,
    limit_cost_cents INTEGER NOT NULL,
    utilization_percent DECIMAL(5,2),
    
    -- Status
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_extraction_logs_created_at ON extraction_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_extraction_logs_status ON extraction_logs(extraction_status);
CREATE INDEX IF NOT EXISTS idx_extraction_logs_provider ON extraction_logs(ai_provider);
CREATE INDEX IF NOT EXISTS idx_extraction_logs_dealer ON extraction_logs(dealer_name);

CREATE INDEX IF NOT EXISTS idx_extraction_costs_date ON extraction_costs(extraction_date);
CREATE INDEX IF NOT EXISTS idx_extraction_costs_provider ON extraction_costs(ai_provider);

CREATE INDEX IF NOT EXISTS idx_extraction_performance_date ON extraction_performance(metric_date, metric_hour);
CREATE INDEX IF NOT EXISTS idx_extraction_performance_provider ON extraction_performance(ai_provider);

CREATE INDEX IF NOT EXISTS idx_budget_alerts_date ON budget_alerts(alert_date);
CREATE INDEX IF NOT EXISTS idx_budget_alerts_type ON budget_alerts(alert_type);

-- Create updated_at trigger for extraction_logs
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_extraction_logs_updated_at 
    BEFORE UPDATE ON extraction_logs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) policies for staging
ALTER TABLE extraction_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_alerts ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for the application)
CREATE POLICY "Service role can manage extraction_logs" ON extraction_logs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage extraction_costs" ON extraction_costs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage extraction_performance" ON extraction_performance
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage budget_alerts" ON budget_alerts
    FOR ALL USING (auth.role() = 'service_role');

-- Insert initial staging data
INSERT INTO extraction_costs (extraction_date, ai_provider, total_extractions, total_tokens_used, total_cost_cents)
VALUES 
    (CURRENT_DATE, 'mock', 0, 0, 0),
    (CURRENT_DATE, 'openai', 0, 0, 0),
    (CURRENT_DATE, 'anthropic', 0, 0, 0)
ON CONFLICT (extraction_date, ai_provider) DO NOTHING;

-- Create a view for easy cost monitoring
CREATE OR REPLACE VIEW daily_cost_summary AS
SELECT 
    extraction_date,
    SUM(total_extractions) as total_extractions,
    SUM(total_tokens_used) as total_tokens_used,
    SUM(total_cost_cents) as total_cost_cents,
    ROUND(SUM(total_cost_cents) / 100.0, 2) as total_cost_usd,
    COUNT(DISTINCT ai_provider) as providers_used
FROM extraction_costs
GROUP BY extraction_date
ORDER BY extraction_date DESC;

-- Create a view for performance monitoring
CREATE OR REPLACE VIEW provider_performance_summary AS
SELECT 
    ai_provider,
    SUM(total_extractions) as total_extractions,
    SUM(successful_extractions) as successful_extractions,
    SUM(failed_extractions) as failed_extractions,
    CASE 
        WHEN SUM(total_extractions) > 0 
        THEN ROUND((SUM(successful_extractions)::DECIMAL / SUM(total_extractions)) * 100, 2)
        ELSE 0 
    END as success_rate_percent,
    ROUND(AVG(avg_processing_time_ms), 0) as avg_processing_time_ms,
    ROUND(AVG(avg_confidence_score), 2) as avg_confidence_score
FROM extraction_performance
WHERE metric_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY ai_provider;

-- Grant permissions on views
GRANT SELECT ON daily_cost_summary TO service_role;
GRANT SELECT ON provider_performance_summary TO service_role;

-- Add a comment to track schema version
COMMENT ON SCHEMA public IS 'AI Extraction Schema v2.0 - Staging Environment';
EOF

    log "AI extraction migration created and applying..."
    supabase db push
fi

# Verify schema deployment
log "Verifying schema deployment..."
supabase db pull --schema public

# Test database connectivity
log "Testing database connectivity..."
if supabase db pull --dry-run > /dev/null 2>&1; then
    log "✅ Database connectivity test passed"
else
    error "❌ Database connectivity test failed"
fi

# Run database health check
log "Running database health check..."
cat > /tmp/staging_db_check.sql << 'EOF'
-- Health check queries for staging database
SELECT 'extraction_logs table' as check_name, COUNT(*) as record_count FROM extraction_logs;
SELECT 'extraction_costs table' as check_name, COUNT(*) as record_count FROM extraction_costs;
SELECT 'extraction_performance table' as check_name, COUNT(*) as record_count FROM extraction_performance;
SELECT 'budget_alerts table' as check_name, COUNT(*) as record_count FROM budget_alerts;

-- Check views
SELECT 'daily_cost_summary view' as check_name, COUNT(*) as record_count FROM daily_cost_summary;
SELECT 'provider_performance_summary view' as check_name, COUNT(*) as record_count FROM provider_performance_summary;

-- Verify indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('extraction_logs', 'extraction_costs', 'extraction_performance', 'budget_alerts')
ORDER BY tablename, indexname;
EOF

# Execute health check
if psql "$VITE_SUPABASE_URL" -f /tmp/staging_db_check.sql > deploy/staging/logs/db-health-check.log 2>&1; then
    log "✅ Database health check completed. See deploy/staging/logs/db-health-check.log"
else
    warn "Database health check had issues. Check deploy/staging/logs/db-health-check.log"
fi

# Clean up
rm -f /tmp/staging_db_check.sql

log "🎉 Database deployment to staging completed successfully!"
log "=================================================="

log "📊 Deployment Summary:"
log "  • AI extraction schema deployed"
log "  • Performance monitoring tables created"
log "  • Cost tracking tables configured"
log "  • Budget alert system ready"
log "  • Database views and indexes created"
log "  • Row Level Security (RLS) enabled"

log ""
log "📋 Next Steps:"
log "  1. Verify application can connect to staging database"
log "  2. Test AI extraction with staging database logging"
log "  3. Validate cost tracking functionality"
log "  4. Test performance monitoring"
log "  5. Verify budget alert system"

log ""
log "🔗 Staging Database Info:"
log "  URL: $VITE_SUPABASE_URL"
log "  Schema Version: v2.0"
log "  Environment: Staging"
log "  Deployment Date: $(date)"