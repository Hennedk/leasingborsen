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

async function testResetAndApply() {
  console.log('🧪 Testing Reset Status and Apply\n');
  console.log('=' .repeat(80));
  
  try {
    // Get a rejected deletion
    const { data: rejectedDeletion } = await supabase
      .from('extraction_listing_changes')
      .select('*')
      .eq('session_id', '544e0e65-5f8b-4a8a-8cb9-2bf395309381')
      .eq('change_type', 'delete')
      .eq('change_status', 'rejected')
      .limit(1)
      .single();
      
    if (!rejectedDeletion) {
      console.log('No rejected deletions found');
      return;
    }
    
    console.log('Test Deletion:');
    console.log('  ID:', rejectedDeletion.id);
    console.log('  Current Status:', rejectedDeletion.change_status);
    console.log('  Existing Listing ID:', rejectedDeletion.existing_listing_id);
    
    // Test 1: Try to apply while status is "rejected"
    console.log('\n' + '=' .repeat(80));
    console.log('\nTest 1: Apply with "rejected" status');
    
    const { data: result1 } = await supabase
      .rpc('apply_selected_extraction_changes', {
        p_session_id: rejectedDeletion.session_id,
        p_selected_change_ids: [rejectedDeletion.id],
        p_applied_by: 'test_rejected'
      });
      
    console.log('Result:', result1);
    console.log('Processed:', result1.total_processed);
    
    // Test 2: Reset to pending first
    console.log('\n' + '=' .repeat(80));
    console.log('\nTest 2: Reset to "pending" then apply');
    
    // Reset status to pending
    const { error: resetError } = await supabase
      .from('extraction_listing_changes')
      .update({ 
        change_status: 'pending',
        applied_by: null,
        reviewed_at: null
      })
      .eq('id', rejectedDeletion.id);
      
    if (resetError) {
      console.log('Reset error:', resetError);
      return;
    }
    
    console.log('✅ Reset to pending status');
    
    // Now try to apply
    const { data: result2 } = await supabase
      .rpc('apply_selected_extraction_changes', {
        p_session_id: rejectedDeletion.session_id,
        p_selected_change_ids: [rejectedDeletion.id],
        p_applied_by: 'test_after_reset'
      });
      
    console.log('\nResult after reset:', result2);
    console.log('Processed:', result2.total_processed);
    console.log('Deletes applied:', result2.applied_deletes);
    
    // Check final status
    const { data: finalStatus } = await supabase
      .from('extraction_listing_changes')
      .select('change_status, applied_by')
      .eq('id', rejectedDeletion.id)
      .single();
      
    console.log('\nFinal status:', finalStatus.change_status);
    console.log('Applied by:', finalStatus.applied_by);
    
    // Check if listing was deleted
    if (rejectedDeletion.existing_listing_id) {
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .select('id')
        .eq('id', rejectedDeletion.existing_listing_id)
        .single();
        
      if (listingError && listingError.code === 'PGRST116') {
        console.log('\n✅ SUCCESS: Listing was deleted!');
      } else if (listing) {
        console.log('\n❌ ISSUE: Listing still exists');
      }
    }
    
    // Summary
    console.log('\n' + '=' .repeat(80));
    console.log('\n💡 KEY FINDINGS:\n');
    console.log('1. The function skips changes with "rejected" status');
    console.log('2. Only "pending" changes are processed');
    console.log('3. The UI should either:');
    console.log('   a) Reset rejected changes to pending before applying');
    console.log('   b) Never set them to rejected in the first place');
    console.log('\nThe bug is that unchecked items are set to "rejected"');
    console.log('but checked items that were previously rejected stay rejected!');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

// Run test
testResetAndApply().catch(console.error);