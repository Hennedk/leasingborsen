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

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkApplyFunctionLogic() {
  console.log('🔍 Checking apply_selected_extraction_changes Function\n');
  console.log('=' .repeat(80));
  
  try {
    // First, let's get the function definition to understand its logic
    const { data: functions, error: funcError } = await supabase
      .rpc('pg_get_functiondef', { 
        funcid: "(SELECT oid FROM pg_proc WHERE proname = 'apply_selected_extraction_changes' LIMIT 1)::oid" 
      })
      .single();
      
    if (funcError && funcError.code === '42883') {
      // Function doesn't exist with that signature, try alternative approach
      console.log('Checking for function in pg_proc...\n');
      
      const { data: procData, error: procError } = await supabase
        .from('pg_proc')
        .select('proname, pronargs')
        .eq('proname', 'apply_selected_extraction_changes');
        
      if (procData) {
        console.log('Found functions:', procData);
      }
    }
    
    // Let's test with a real deletion scenario
    console.log('\n' + '=' .repeat(80));
    console.log('\n🧪 Testing Deletion Logic:\n');
    
    // Get a recent session with deletions
    const { data: sessions } = await supabase
      .from('extraction_sessions')
      .select('id, session_name, seller_id')
      .order('created_at', { ascending: false })
      .limit(10);
      
    console.log('Recent sessions:');
    sessions?.forEach(s => {
      console.log(`  - ${s.id}: ${s.session_name}`);
    });
    
    // Check what happens when we try to apply a deletion
    const testSessionId = '544e0e65-5f8b-4a8a-8cb9-2bf395309381';
    
    const { data: deletionChanges } = await supabase
      .from('extraction_listing_changes')
      .select('*')
      .eq('session_id', testSessionId)
      .eq('change_type', 'delete')
      .limit(1);
      
    if (deletionChanges && deletionChanges.length > 0) {
      const deletion = deletionChanges[0];
      console.log('\nTest deletion:');
      console.log('  ID:', deletion.id);
      console.log('  Status:', deletion.change_status);
      console.log('  Has listing_id:', !!deletion.listing_id);
      console.log('  Has existing_listing_id:', !!deletion.existing_listing_id);
      console.log('  Extracted data keys:', deletion.extracted_data ? Object.keys(deletion.extracted_data) : 'none');
      
      // Check if there's a listing_id to delete
      if (!deletion.listing_id && !deletion.existing_listing_id) {
        console.log('\n❌ PROBLEM IDENTIFIED: Deletion record has no listing_id!');
        console.log('   This means the function cannot know which listing to delete.');
      }
    }
    
    // Check the actual function parameters
    console.log('\n' + '=' .repeat(80));
    console.log('\n📋 Function Parameter Check:\n');
    
    // Try calling with empty arrays to see the function signature
    const { data: testCall, error: testError } = await supabase
      .rpc('apply_selected_extraction_changes', {
        p_session_id: 'test-id',
        p_selected_change_ids: [],
        p_applied_by: 'test'
      });
      
    if (testError) {
      console.log('Function call error:', testError.message);
      
      // Check if it's because wrong parameters
      if (testError.message.includes('function') && testError.message.includes('does not exist')) {
        console.log('\n⚠️  Function might have different parameters than expected');
        
        // Try alternative parameter names
        const { error: altError } = await supabase
          .rpc('apply_selected_extraction_changes', {
            p_session_id: 'test-id',
            p_change_ids: [],
            p_user_id: 'test'
          });
          
        if (!altError || altError.message !== testError.message) {
          console.log('✅ Alternative parameters work: p_change_ids, p_user_id');
        }
      }
    } else {
      console.log('✅ Function callable with current parameters');
    }
    
    // Summary
    console.log('\n' + '=' .repeat(80));
    console.log('\n💡 POTENTIAL ISSUES:\n');
    console.log('1. Deletion records might not have listing_id populated');
    console.log('2. The function might reject deletions if listing_id is missing');
    console.log('3. The UI might not be properly selecting deletions for application');
    console.log('4. The function parameters might be different than expected');
    console.log('\nNext steps:');
    console.log('- Check how listing_id is populated for deletion records');
    console.log('- Verify the function actually processes selected deletions');
    console.log('- Check if the UI is sending deletion IDs in selectedChangeIds');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

// Run check
checkApplyFunctionLogic().catch(console.error);