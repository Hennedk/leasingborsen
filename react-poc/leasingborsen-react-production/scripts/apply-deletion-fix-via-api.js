#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

// Note: This would need service role key for full access, but we'll try with anon key
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function applyDeletionFix() {
  console.log('📦 APPLYING DELETION FIX MIGRATION');
  console.log('=' .repeat(80));
  
  try {
    // Read the migration file
    const migrationPath = join(__dirname, '../supabase/migrations/20250713_fix_deletion_all_references.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    console.log('Migration file loaded, length:', migrationSQL.length);
    console.log('\n⚠️  Note: This script cannot apply the migration directly.');
    console.log('Please apply the migration through Supabase Dashboard:\n');
    console.log('1. Go to: https://supabase.com/dashboard/project/hqqouszbgskteivjoems/sql/new');
    console.log('2. Paste the migration SQL from:');
    console.log('   supabase/migrations/20250713_fix_deletion_all_references.sql');
    console.log('3. Click "Run"\n');
    console.log('The key change is on line ~323:');
    console.log('   DELETE FROM extraction_listing_changes');
    console.log('   WHERE existing_listing_id = v_listing_to_delete;');
    console.log('   -- No more status filter!\n');
    
    // Test if we can at least check the current function
    console.log('Checking current function definition...');
    
    const { data, error } = await supabase
      .rpc('apply_selected_extraction_changes', {
        p_session_id: '00000000-0000-0000-0000-000000000000',
        p_selected_change_ids: [],
        p_applied_by: 'test'
      });
      
    if (error && error.message.includes('No function matches')) {
      console.log('❌ Function not found - migration definitely needed');
    } else {
      console.log('✅ Function exists - ready to apply migration');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

// Run
applyDeletionFix().catch(console.error);