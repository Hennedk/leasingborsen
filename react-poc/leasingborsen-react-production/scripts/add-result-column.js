#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function addResultColumn() {
  try {
    console.log('🔧 Adding result column to processing_jobs table...');
    console.log('====================================================');
    
    // Note: This would normally require service role permissions
    // Since we can't execute DDL with the anon key, let's create a migration file instead
    
    console.log('❌ Cannot execute DDL with anon key.');
    console.log('💡 Creating migration file instead...');
    
    const migrationSQL = `
-- Add result column to store extracted vehicle data
-- Migration: $(date +%Y%m%d_%H%M%S)_add_result_column.sql

ALTER TABLE processing_jobs 
ADD COLUMN IF NOT EXISTS result JSONB;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_processing_jobs_result ON processing_jobs USING GIN (result);

-- Add comment for documentation
COMMENT ON COLUMN processing_jobs.result IS 'Stores the complete extraction result including extractedItems array';

-- Example structure:
-- {
--   "method": "pattern",
--   "itemsProcessed": 50,
--   "averageConfidence": 0.85,
--   "aiCost": 0.00,
--   "aiTokens": 0,
--   "extractedItems": [
--     {
--       "model": "Yaris",
--       "variant": "Active",
--       "monthly_price": 3299,
--       "mileage_per_year": 10000,
--       "period_months": 36,
--       "extraction_method": "pattern_1"
--     }
--   ]
-- }
`;

    console.log('\n📄 Migration SQL:');
    console.log('================');
    console.log(migrationSQL);
    
    console.log('\n💡 To apply this migration:');
    console.log('1. Copy the SQL above');
    console.log('2. Execute it in your Supabase SQL Editor');
    console.log('3. Then re-run the Edge Function with the missing result storage code');
    
  } catch (error) {
    console.error('❌ Migration preparation failed:', error.message);
  }
}

addResultColumn();