#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testApplySelected() {
  // First, reset the test data by updating all changes back to pending
  console.log('🔄 Resetting test data...');
  
  const sessionId = '37eb7e68-9bc1-4cb3-9179-06e1db74be00';
  
  // Reset all changes to pending
  const { error: resetError } = await supabase
    .from('extraction_listing_changes')
    .update({ change_status: 'pending', reviewed_at: null })
    .eq('session_id', sessionId);
    
  if (resetError) {
    console.error('Error resetting changes:', resetError);
    return;
  }
  
  // Reset session status
  const { error: sessionResetError } = await supabase
    .from('extraction_sessions')
    .update({ status: 'pending', applied_at: null })
    .eq('id', sessionId);
    
  if (sessionResetError) {
    console.error('Error resetting session:', sessionResetError);
    return;
  }
  
  console.log('✅ Test data reset complete');
  
  // Now test applying a single UPDATE change
  const updateChangeId = 'c108a388-dce3-4cac-9ba8-f8b1d8a63065';
  
  console.log('\n🚀 Testing apply_selected_extraction_changes with single UPDATE change');
  console.log('Selected change ID:', updateChangeId);
  
  // Call the function with just one selected change
  const { data, error } = await supabase
    .rpc('apply_selected_extraction_changes', {
      p_session_id: sessionId,
      p_selected_change_ids: [updateChangeId], // Array with single ID
      p_applied_by: 'test-script'
    });
    
  if (error) {
    console.error('❌ Error applying changes:', error);
    return;
  }
  
  console.log('\n✅ Function executed successfully');
  console.log('Result:', JSON.stringify(data, null, 2));
  
  // Verify the changes
  console.log('\n🔍 Verifying changes...');
  
  // Check the specific change status
  const { data: updatedChange } = await supabase
    .from('extraction_listing_changes')
    .select('id, change_status, change_type, change_summary')
    .eq('id', updateChangeId)
    .single();
    
  if (updatedChange) {
    console.log('Selected change status:', updatedChange.change_status);
  }
  
  // Check overall status counts
  const { data: allChanges } = await supabase
    .from('extraction_listing_changes')
    .select('change_status')
    .eq('session_id', sessionId);
    
  if (allChanges) {
    const statusCounts = allChanges.reduce((acc, change) => {
      acc[change.change_status] = (acc[change.change_status] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\nStatus summary:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
  }
}

testApplySelected().catch(console.error);