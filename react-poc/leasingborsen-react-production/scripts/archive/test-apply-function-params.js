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

async function testApplyFunctionParams() {
  console.log('🧪 Testing apply_selected_extraction_changes Parameters\n');
  console.log('=' .repeat(80));
  
  try {
    // Get a test session with pending deletions
    const { data: testSession } = await supabase
      .from('extraction_sessions')
      .select('id, session_name, seller_id')
      .eq('id', '544e0e65-5f8b-4a8a-8cb9-2bf395309381')
      .single();
      
    console.log('Test Session:', testSession.session_name);
    console.log('Session ID:', testSession.id);
    
    // Get one deletion to test
    const { data: deletions } = await supabase
      .from('extraction_listing_changes')
      .select('id, change_type, change_status, existing_listing_id')
      .eq('session_id', testSession.id)
      .eq('change_type', 'delete')
      .limit(1);
      
    if (!deletions || deletions.length === 0) {
      console.log('No deletions found in this session');
      return;
    }
    
    const testDeletion = deletions[0];
    console.log('\nTest Deletion:');
    console.log('  Change ID:', testDeletion.id);
    console.log('  Status:', testDeletion.change_status);
    console.log('  Existing Listing ID:', testDeletion.existing_listing_id);
    
    // Try different parameter combinations
    console.log('\n' + '=' .repeat(80));
    console.log('\n📋 Testing Function Calls:\n');
    
    // Test 1: With p_selected_change_ids
    console.log('Test 1: Using p_selected_change_ids parameter');
    const { data: result1, error: error1 } = await supabase
      .rpc('apply_selected_extraction_changes', {
        p_session_id: testSession.id,
        p_selected_change_ids: [testDeletion.id],
        p_applied_by: 'test_script'
      });
      
    if (error1) {
      console.log('  ❌ Error:', error1.message);
      
      // Test 2: With p_change_ids (alternative name)
      console.log('\nTest 2: Using p_change_ids parameter');
      const { data: result2, error: error2 } = await supabase
        .rpc('apply_selected_extraction_changes', {
          p_session_id: testSession.id,
          p_change_ids: [testDeletion.id],
          p_user_id: 'test_script'
        });
        
      if (error2) {
        console.log('  ❌ Error:', error2.message);
      } else {
        console.log('  ✅ Success with alternative parameters!');
        console.log('  Result:', result2);
      }
    } else {
      console.log('  ✅ Success!');
      console.log('  Result:', result1);
      
      // Check if the deletion was actually processed
      const { data: updatedChange } = await supabase
        .from('extraction_listing_changes')
        .select('change_status')
        .eq('id', testDeletion.id)
        .single();
        
      console.log('\nDeletion status after call:', updatedChange?.change_status);
      
      // Check if the listing still exists
      if (testDeletion.existing_listing_id) {
        const { data: listing, error: listingError } = await supabase
          .from('listings')
          .select('id')
          .eq('id', testDeletion.existing_listing_id)
          .single();
          
        if (listingError && listingError.code === 'PGRST116') {
          console.log('Listing was deleted! ✅');
        } else if (listing) {
          console.log('Listing still exists ❌');
        }
      }
    }
    
    // Check what the UI is sending
    console.log('\n' + '=' .repeat(80));
    console.log('\n🔍 What the UI Should Send:\n');
    console.log('When you select deletions and click Apply:');
    console.log('1. selectedChangeIds should include the deletion change IDs');
    console.log('2. The function should process these IDs');
    console.log('3. For delete type, it should use existing_listing_id to delete');
    console.log('\nCurrent issue: Selected deletions might not be included in selectedChangeIds');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

// Run test
testApplyFunctionParams().catch(console.error);