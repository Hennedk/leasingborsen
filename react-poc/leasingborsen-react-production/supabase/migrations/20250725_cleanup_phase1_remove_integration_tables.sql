-- Phase 1: Database Cleanup - Remove Unused Integration Tables
-- This migration removes 3 tables with 0 live rows and 0 code references
-- These tables are artifacts from the Vue->React migration

-- Drop tables in dependency order (children first)
-- integration_run_logs -> integration_runs -> integrations

-- 1. Drop integration_run_logs (has foreign key to integration_runs)
DROP TABLE IF EXISTS integration_run_logs CASCADE;

-- 2. Drop integration_runs (has foreign key to integrations)  
DROP TABLE IF EXISTS integration_runs CASCADE;

-- 3. Drop integrations (root table, has foreign key from sellers but unused)
DROP TABLE IF EXISTS integrations CASCADE;

-- Comment for migration tracking
COMMENT ON SCHEMA public IS 'Phase 1 cleanup completed: Removed unused integration tables (integration_run_logs, integration_runs, integrations)';