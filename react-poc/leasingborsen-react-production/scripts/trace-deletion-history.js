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

async function traceDeletionHistory() {
  const sessionId = '91d57eee-517b-4a22-8185-7fa000d584c0';
  const listingId = 'e5841862-1d46-4450-9710-6f7c037741ba';
  const changeId = 'bb3496e0-df99-4c5d-b99b-e796a507f1d6';
  
  console.log('🕐 TRACING DELETION HISTORY');
  console.log('=' .repeat(80));
  console.log(`Session ID: ${sessionId}`);
  console.log(`Listing ID: ${listingId}`);
  console.log(`Change ID: ${changeId}`);
  console.log('=' .repeat(80));

  try {
    // 1. Get the full change record with all details
    console.log('\n1️⃣ Full deletion change record:\n');
    
    const { data: changeRecord, error: changeError } = await supabase
      .from('extraction_listing_changes')
      .select('*')
      .eq('id', changeId)
      .single();

    if (changeError || !changeRecord) {
      console.error('Error fetching change record:', changeError);
      return;
    }

    console.log('Change Details:');
    console.log('  Status:', changeRecord.change_status);
    console.log('  Created:', new Date(changeRecord.created_at).toLocaleString());
    console.log('  Reviewed:', changeRecord.reviewed_at ? new Date(changeRecord.reviewed_at).toLocaleString() : 'Not reviewed');
    console.log('  Applied By:', changeRecord.applied_by || 'Not set');
    console.log('  Review Notes:', changeRecord.review_notes || 'None');
    console.log('  Extracted Data:', JSON.stringify(changeRecord.extracted_data, null, 2));

    // 2. Check the timeline of events
    console.log('\n2️⃣ Timeline of all changes for this listing:\n');
    
    const { data: allChanges } = await supabase
      .from('extraction_listing_changes')
      .select('*')
      .eq('existing_listing_id', listingId)
      .order('created_at', { ascending: true });

    if (allChanges) {
      allChanges.forEach((change, idx) => {
        console.log(`\nEvent ${idx + 1}:`);
        console.log(`  Time: ${new Date(change.created_at).toLocaleString()}`);
        console.log(`  Session: ${change.session_id === sessionId ? 'CURRENT SESSION' : change.session_id}`);
        console.log(`  Type: ${change.change_type}`);
        console.log(`  Status: ${change.change_status}`);
        if (change.review_notes) {
          console.log(`  Notes: ${change.review_notes}`);
        }
      });
    }

    // 3. Check what happened during the rejection
    console.log('\n3️⃣ Analyzing the rejection:\n');
    
    if (changeRecord.review_notes && changeRecord.review_notes.includes('Apply error:')) {
      console.log('❌ This was an AUTOMATIC rejection due to an error during apply!');
      console.log('Error message:', changeRecord.review_notes);
      
      // Parse the error
      if (changeRecord.review_notes.includes('foreign key constraint')) {
        console.log('\n🔍 Foreign Key Constraint Violation Detected!');
        console.log('This means the listing could not be deleted because:');
        console.log('  - Other records in the database still reference this listing');
        console.log('  - The most common cause is other extraction_listing_changes records');
        console.log('  - The deletion was blocked by PostgreSQL to maintain data integrity');
      }
    } else if (changeRecord.change_status === 'rejected') {
      console.log('❌ This was MANUALLY rejected by a user');
      console.log('Rejected by:', changeRecord.applied_by || 'Unknown');
      console.log('Rejection time:', changeRecord.reviewed_at ? new Date(changeRecord.reviewed_at).toLocaleString() : 'Unknown');
    }

    // 4. Check other references that might be blocking deletion
    console.log('\n4️⃣ Checking for blocking references:\n');
    
    // Check other extraction changes from different sessions
    const { data: otherSessionChanges } = await supabase
      .from('extraction_listing_changes')
      .select('id, session_id, change_type, change_status, created_at')
      .eq('existing_listing_id', listingId)
      .neq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (otherSessionChanges && otherSessionChanges.length > 0) {
      console.log(`⚠️  Found ${otherSessionChanges.length} references from OTHER sessions:`);
      otherSessionChanges.forEach(ref => {
        console.log(`  - Session: ${ref.session_id}`);
        console.log(`    Type: ${ref.change_type}, Status: ${ref.change_status}`);
        console.log(`    Created: ${new Date(ref.created_at).toLocaleString()}`);
      });
      console.log('\n💡 These references must be cleaned up before deletion can succeed!');
    }

    // 5. Check the deletion logic in the apply function
    console.log('\n5️⃣ Understanding the deletion process:\n');
    console.log('The apply_selected_extraction_changes function attempts to:');
    console.log('  1. Delete from extraction_listing_changes WHERE:');
    console.log('     - existing_listing_id = listing_id');
    console.log('     - change_status IN (\'pending\', \'discarded\')');
    console.log('     - id != current_change_id');
    console.log('  2. Delete from price_change_log');
    console.log('  3. Delete from lease_pricing');
    console.log('  4. Delete from listings');
    
    console.log('\n⚠️  The problem: It only deletes SOME extraction_listing_changes');
    console.log('   - Only deletes pending/discarded statuses');
    console.log('   - Does NOT delete applied/rejected changes from other sessions');
    console.log('   - This leaves foreign key references that block the deletion!');

    // 6. Summary
    console.log('\n6️⃣ SUMMARY:\n');
    console.log('The deletion was rejected because:');
    console.log('1. The apply function tried to delete the listing');
    console.log('2. PostgreSQL blocked it due to foreign key constraint');
    console.log('3. Other extraction_listing_changes records still reference this listing');
    console.log('4. The function marked it as "rejected" with the error message');
    console.log('5. Now it\'s stuck in "rejected" status and won\'t be retried');
    
    console.log('\n💡 SOLUTION:');
    console.log('The frontend\'s reset feature should handle this, or run:');
    console.log('node scripts/fix-deletion-constraint-issue.js');

  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
  }
}

// Run the trace
traceDeletionHistory().catch(console.error);