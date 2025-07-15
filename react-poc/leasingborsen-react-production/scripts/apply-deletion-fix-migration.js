#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function applyMigration() {
  console.log('🔧 Applying Deletion Fix Migration\n');
  console.log('=' .repeat(80));
  
  try {
    // Read the migration file
    const migrationPath = join(__dirname, '../supabase/migrations/20250711_fix_deletion_ambiguity.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf-8');
    
    console.log('📄 Migration file found');
    console.log('🚀 Applying migration...\n');
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });
    
    if (error) {
      // If exec_sql doesn't exist, try direct execution
      console.log('⚠️  exec_sql RPC not available, trying alternative method...');
      
      // You'll need to run this migration through Supabase dashboard or CLI
      console.log('\n❗ IMPORTANT: Run this migration manually:\n');
      console.log('1. Go to Supabase Dashboard > SQL Editor');
      console.log('2. Paste the contents of:');
      console.log('   supabase/migrations/20250711_fix_deletion_ambiguity.sql');
      console.log('3. Run the query\n');
      console.log('OR use Supabase CLI:');
      console.log('   supabase db push\n');
      
      return;
    }
    
    console.log('✅ Migration applied successfully!');
    
    // Test if the function was updated
    console.log('\n🧪 Testing the updated function...');
    
    // Get the session with deletions
    const { data: testResult } = await supabase
      .rpc('apply_selected_extraction_changes', {
        p_session_id: 'c917ee3c-e08a-4bb7-968d-1ad21cf4e60a',
        p_selected_change_ids: [],
        p_applied_by: 'migration_test'
      });
      
    if (testResult) {
      console.log('✅ Function is working!');
    }
    
    console.log('\n' + '=' .repeat(80));
    console.log('\n🎉 Migration Complete!\n');
    console.log('The deletion workflow should now work correctly.');
    console.log('Try selecting and applying deletions again.');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    console.log('\n💡 Please apply the migration manually through Supabase Dashboard');
  }
}

// Run migration
applyMigration().catch(console.error);