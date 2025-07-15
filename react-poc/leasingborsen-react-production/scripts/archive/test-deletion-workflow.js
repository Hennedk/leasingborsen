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

async function testDeletionWorkflow() {
  console.log('🧪 Testing Deletion Workflow\n');
  console.log('=' .repeat(80));
  
  try {
    // Get the latest session
    const { data: sessions } = await supabase
      .from('extraction_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (!sessions || sessions.length === 0) {
      console.log('No extraction sessions found');
      return;
    }
    
    const session = sessions[0];
    console.log('Testing with session:', session.id);
    console.log('Session name:', session.session_name);
    
    // Get one pending deletion
    const { data: deletions } = await supabase
      .from('extraction_listing_changes')
      .select('*')
      .eq('session_id', session.id)
      .eq('change_type', 'delete')
      .eq('change_status', 'pending')
      .limit(1);
      
    if (!deletions || deletions.length === 0) {
      console.log('\nNo pending deletions found in this session');
      return;
    }
    
    const testDeletion = deletions[0];
    console.log('\n' + '=' .repeat(80));
    console.log('\nTest Deletion:');
    console.log('  Change ID:', testDeletion.id);
    console.log('  Listing ID:', testDeletion.existing_listing_id);
    console.log('  Summary:', testDeletion.change_summary);
    
    // Check if the listing exists
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id')
      .eq('id', testDeletion.existing_listing_id)
      .single();
      
    if (listingError) {
      console.log('\n⚠️  Listing not found (may have been deleted already)');
      return;
    }
    
    console.log('\n✅ Listing exists and will be deleted');
    
    // Apply the deletion
    console.log('\n' + '=' .repeat(80));
    console.log('\nApplying deletion...');
    
    const { data: result, error: applyError } = await supabase
      .rpc('apply_selected_extraction_changes', {
        p_session_id: session.id,
        p_selected_change_ids: [testDeletion.id],
        p_applied_by: 'test_deletion_workflow'
      });
      
    if (applyError) {
      console.error('\n❌ Error applying deletion:', applyError);
      console.error('Error details:', JSON.stringify(applyError, null, 2));
      return;
    }
    
    console.log('\n✅ Function executed successfully');
    console.log('Result:', JSON.stringify(result, null, 2));
    
    // Verify the deletion
    const { data: checkListing, error: checkError } = await supabase
      .from('listings')
      .select('id')
      .eq('id', testDeletion.existing_listing_id)
      .single();
      
    if (checkError && checkError.code === 'PGRST116') {
      console.log('\n🎉 SUCCESS: Listing was deleted!');
    } else if (checkListing) {
      console.log('\n❌ ISSUE: Listing still exists after deletion attempt');
    }
    
    // Check the change status
    const { data: updatedChange } = await supabase
      .from('extraction_listing_changes')
      .select('change_status, applied_by')
      .eq('id', testDeletion.id)
      .single();
      
    console.log('\nChange status after apply:', updatedChange.change_status);
    console.log('Applied by:', updatedChange.applied_by);
    
    console.log('\n' + '=' .repeat(80));
    console.log('\n✅ Deletion workflow test complete!');
    console.log('\nThe UI improvements include:');
    console.log('1. Listing IDs shown in table for deletion items');
    console.log('2. Special deletion warning panel in details view');
    console.log('3. Link to view/edit listing before deletion');
    console.log('4. Clear visual feedback with red coloring');
    
  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
  }
}

// Run test
testDeletionWorkflow().catch(console.error);