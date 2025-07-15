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

async function testDeletionFix() {
  const sessionId = '91d57eee-517b-4a22-8185-7fa000d584c0';
  const listingId = 'e5841862-1d46-4450-9710-6f7c037741ba';
  const changeId = 'bb3496e0-df99-4c5d-b99b-e796a507f1d6';
  
  console.log('🧪 TESTING DELETION FIX');
  console.log('=' .repeat(80));
  console.log(`Session ID: ${sessionId}`);
  console.log(`Listing ID: ${listingId}`);
  console.log(`Change ID: ${changeId}`);
  console.log('=' .repeat(80));

  try {
    // 1. Reset the deletion to pending status
    console.log('\n1️⃣ Resetting deletion to pending status...\n');
    
    const { error: resetError } = await supabase
      .from('extraction_listing_changes')
      .update({ 
        change_status: 'pending',
        review_notes: null,
        reviewed_at: null,
        applied_by: null
      })
      .eq('id', changeId);

    if (resetError) {
      console.error('Error resetting status:', resetError);
      return;
    }
    
    console.log('✅ Reset successful!');
    
    // 2. Check how many references exist before
    console.log('\n2️⃣ Checking references before deletion...\n');
    
    const { data: referencesBefore } = await supabase
      .from('extraction_listing_changes')
      .select('id, session_id, change_type, change_status')
      .eq('existing_listing_id', listingId);
      
    console.log(`Found ${referencesBefore?.length || 0} references to this listing:`);
    referencesBefore?.forEach(ref => {
      console.log(`  - ${ref.id} (${ref.change_type}, ${ref.change_status})`);
    });
    
    // 3. Test the apply function
    console.log('\n3️⃣ Testing apply_selected_extraction_changes...\n');
    
    const { data: applyResult, error: applyError } = await supabase
      .rpc('apply_selected_extraction_changes', {
        p_session_id: sessionId,
        p_selected_change_ids: [changeId],
        p_applied_by: 'test_fix_script'
      });

    if (applyError) {
      console.error('❌ Apply error:', applyError);
      return;
    }
    
    console.log('✅ Apply function result:', JSON.stringify(applyResult, null, 2));
    
    // 4. Check if listing was deleted
    console.log('\n4️⃣ Checking if listing was deleted...\n');
    
    const { data: listingCheck } = await supabase
      .from('listings')
      .select('id')
      .eq('id', listingId)
      .single();
      
    if (!listingCheck) {
      console.log('🎉 SUCCESS: Listing was deleted!');
    } else {
      console.log('❌ FAILURE: Listing still exists');
    }
    
    // 5. Check remaining references
    console.log('\n5️⃣ Checking references after deletion...\n');
    
    const { data: referencesAfter } = await supabase
      .from('extraction_listing_changes')
      .select('id, session_id, change_type, change_status')
      .eq('existing_listing_id', listingId);
      
    console.log(`Found ${referencesAfter?.length || 0} references remaining`);
    if (referencesAfter && referencesAfter.length > 0) {
      console.log('⚠️  References still exist after deletion:');
      referencesAfter.forEach(ref => {
        console.log(`  - ${ref.id} (${ref.change_type}, ${ref.change_status})`);
      });
    }
    
    // 6. Summary
    console.log('\n6️⃣ SUMMARY:\n');
    
    if (!listingCheck && (!referencesAfter || referencesAfter.length === 0)) {
      console.log('✅ The fix works! Deletion succeeded and all references were cleaned up.');
    } else {
      console.log('❌ The fix needs more work:');
      if (listingCheck) console.log('  - Listing was not deleted');
      if (referencesAfter && referencesAfter.length > 0) console.log('  - References were not cleaned up');
    }

  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
  }
}

// Run the test
testDeletionFix().catch(console.error);