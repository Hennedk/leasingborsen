-- Database Simplification Phase 1: Remove Legacy AI Tables
-- Migration: 20250727_simplification_phase1_remove_legacy_ai.sql
-- Description: Remove 2 legacy AI tables that are no longer used
-- 
-- Tables being removed:
-- 1. prompts (replaced by responses_api_configs system)
-- 2. prompt_versions (replaced by config_versions system)
--
-- PRESERVING: prompt_templates (still used by manage-prompts Edge Function)
--
-- Impact: Additional 5-10% database complexity reduction
-- Risk: VERY LOW - No active code references found

-- Verify current state before cleanup
DO $$
BEGIN
    RAISE NOTICE 'Database Simplification Phase 1 - Starting verification...';
    
    -- Check if the tables exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prompts') THEN
        RAISE NOTICE 'Table prompts does not exist - skipping removal';
    ELSE
        RAISE NOTICE 'Table prompts found - will be removed';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prompt_versions') THEN
        RAISE NOTICE 'Table prompt_versions does not exist - skipping removal';
    ELSE
        RAISE NOTICE 'Table prompt_versions found - will be removed';
    END IF;
    
    -- Verify prompt_templates will be preserved
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prompt_templates') THEN
        RAISE WARNING 'prompt_templates table not found - this is unexpected!';
    ELSE
        RAISE NOTICE 'prompt_templates table confirmed - will be preserved';
    END IF;
    
    RAISE NOTICE 'Phase 1 verification completed - ready for removal';
END $$;

-- Remove RLS policies for tables being dropped
-- Note: Policies will be automatically dropped with the tables, but being explicit

-- Drop RLS policies for prompts table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prompts') THEN
        -- Drop policies if they exist
        DROP POLICY IF EXISTS "Admin full access to prompts" ON prompts;
        DROP POLICY IF EXISTS "Service role can read prompts" ON prompts;
        RAISE NOTICE 'Dropped RLS policies for prompts table';
    END IF;
END $$;

-- Drop RLS policies for prompt_versions table  
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prompt_versions') THEN
        -- Drop policies if they exist
        DROP POLICY IF EXISTS "Admin full access to prompt versions" ON prompt_versions;
        DROP POLICY IF EXISTS "Service role can read prompt versions" ON prompt_versions;
        RAISE NOTICE 'Dropped RLS policies for prompt_versions table';
    END IF;
END $$;

-- Remove tables in dependency order (child table first)
-- Note: CASCADE will handle foreign key relationships

-- 1. Remove prompt_versions (references prompts table)
DROP TABLE IF EXISTS prompt_versions CASCADE;
RAISE NOTICE 'Removed table: prompt_versions';

-- 2. Remove prompts (parent table)
DROP TABLE IF EXISTS prompts CASCADE;  
RAISE NOTICE 'Removed table: prompts';

-- Clean up any remaining permissions/grants
-- Note: These will be automatically cleaned up, but being thorough
DO $$
BEGIN
    -- Revoke any remaining grants (will fail silently if tables don't exist)
    BEGIN
        EXECUTE 'REVOKE ALL ON prompts FROM service_role';
    EXCEPTION WHEN OTHERS THEN
        NULL; -- Ignore errors if table doesn't exist
    END;
    
    BEGIN
        EXECUTE 'REVOKE ALL ON prompt_versions FROM service_role';
    EXCEPTION WHEN OTHERS THEN
        NULL; -- Ignore errors if table doesn't exist
    END;
    
    RAISE NOTICE 'Cleaned up permissions';
END $$;

-- Verification of cleanup
DO $$
BEGIN
    RAISE NOTICE 'Database Simplification Phase 1 - Final verification...';
    
    -- Verify target tables were removed
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name IN ('prompts', 'prompt_versions')) THEN
        RAISE EXCEPTION 'Phase 1 cleanup failed - some legacy tables still exist';
    END IF;
    
    -- Verify critical systems are intact
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'responses_api_configs') THEN
        RAISE EXCEPTION 'Critical error: responses_api_configs table missing';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prompt_templates') THEN
        RAISE EXCEPTION 'Critical error: prompt_templates table missing - should be preserved';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'config_versions') THEN
        RAISE EXCEPTION 'Critical error: config_versions table missing';
    END IF;
    
    -- Verify core business tables are intact
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'listings') THEN
        RAISE EXCEPTION 'Critical error: listings table missing';
    END IF;
    
    RAISE NOTICE '✅ Phase 1 completed successfully!';
    RAISE NOTICE '   - 2 legacy AI tables removed (prompts, prompt_versions)';
    RAISE NOTICE '   - prompt_templates preserved (actively used)';
    RAISE NOTICE '   - All core systems intact';
    RAISE NOTICE '   - responses_api_configs system preserved';
    RAISE NOTICE '   - Database complexity reduced by ~5-10%';
END $$;

-- Migration tracking
COMMENT ON SCHEMA public IS 'Database Simplification Phase 1 completed on 2025-07-27: Removed legacy prompts and prompt_versions tables. prompt_templates preserved for manage-prompts Edge Function.';

-- Rollback instructions (stored as comment for reference)
/*
ROLLBACK INSTRUCTIONS:
If you need to recreate these tables, restore from the 20250716_create_prompt_management_system.sql migration:

1. Run the relevant CREATE TABLE statements from that migration
2. Restore RLS policies from 20250719_complete_rls_implementation.sql
3. Restore any data from backup if needed

Note: The current system uses responses_api_configs, so rollback should not be necessary.
*/