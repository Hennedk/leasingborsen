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

async function checkExtractionDeletionLogs() {
  const sessionId = '3857c66d-1526-4921-b77a-d21d164498cc';
  
  console.log('🔍 CHECKING DELETION LOGS FOR EXTRACTION SESSION');
  console.log('=' .repeat(80));
  console.log(`Session ID: ${sessionId}`);
  console.log('=' .repeat(80));

  try {
    // 1. Check session details
    console.log('\n1️⃣ Session Details:\n');
    
    const { data: session, error: sessionError } = await supabase
      .from('extraction_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      console.error('Error fetching session:', sessionError);
      return;
    }

    console.log('Session Name:', session.session_name);
    console.log('Status:', session.status);
    console.log('Total Deleted:', session.total_deleted);
    console.log('Created:', new Date(session.created_at).toLocaleString());
    console.log('Applied At:', session.applied_at ? new Date(session.applied_at).toLocaleString() : 'Not applied');

    // 2. Check deletion changes and their status
    console.log('\n2️⃣ Deletion Changes:\n');
    
    const { data: deletions } = await supabase
      .from('extraction_listing_changes')
      .select('*')
      .eq('session_id', sessionId)
      .eq('change_type', 'delete')
      .order('created_at');

    console.log(`Found ${deletions?.length || 0} deletion changes:`);
    
    if (deletions && deletions.length > 0) {
      // Group by status
      const statusGroups = deletions.reduce((acc, del) => {
        acc[del.change_status] = (acc[del.change_status] || 0) + 1;
        return acc;
      }, {});
      
      console.log('\nStatus Summary:');
      Object.entries(statusGroups).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });
      
      // Show rejected deletions with error details
      const rejected = deletions.filter(d => d.change_status === 'rejected');
      if (rejected.length > 0) {
        console.log('\n❌ REJECTED DELETIONS WITH ERRORS:');
        rejected.forEach((del, idx) => {
          console.log(`\n  Deletion ${idx + 1}:`);
          console.log(`    ID: ${del.id}`);
          console.log(`    Listing ID: ${del.existing_listing_id}`);
          console.log(`    Review Notes: ${del.review_notes || 'No error message'}`);
          console.log(`    Applied By: ${del.applied_by || 'Not set'}`);
          console.log(`    Reviewed At: ${del.reviewed_at ? new Date(del.reviewed_at).toLocaleString() : 'Not reviewed'}`);
        });
      }
      
      // Show sample of pending deletions
      const pending = deletions.filter(d => d.change_status === 'pending');
      if (pending.length > 0) {
        console.log(`\n⏳ PENDING DELETIONS: ${pending.length} total`);
        pending.slice(0, 3).forEach((del, idx) => {
          console.log(`\n  Sample ${idx + 1}:`);
          console.log(`    ID: ${del.id}`);
          console.log(`    Listing ID: ${del.existing_listing_id}`);
        });
      }
    }

    // 3. Check if apply function was called
    console.log('\n3️⃣ Checking Apply Function Logs:\n');
    
    // The apply function returns results - let's check if we can find any recent apply attempts
    console.log('Note: The apply_selected_extraction_changes function logs errors in:');
    console.log('  - extraction_listing_changes.review_notes (for individual change errors)');
    console.log('  - extraction_listing_changes.change_status = "rejected" (for failed changes)');
    console.log('\nThe function returns a JSON result with:');
    console.log('  - applied_deletes: count of successful deletions');
    console.log('  - error_count: count of failed operations');
    console.log('  - errors: array of error details');
    
    // 4. Check for foreign key issues
    console.log('\n4️⃣ Checking for Potential Foreign Key Issues:\n');
    
    // Sample check for one deletion
    if (deletions && deletions.length > 0) {
      const sampleDeletion = deletions[0];
      if (sampleDeletion.existing_listing_id) {
        console.log(`Checking references for sample listing: ${sampleDeletion.existing_listing_id}`);
        
        const { data: refs } = await supabase
          .from('extraction_listing_changes')
          .select('id, session_id, change_type, change_status')
          .eq('existing_listing_id', sampleDeletion.existing_listing_id)
          .neq('session_id', sessionId);
          
        if (refs && refs.length > 0) {
          console.log(`  ⚠️  Found ${refs.length} references from OTHER sessions`);
          console.log('  This could cause foreign key issues with the OLD deletion logic');
        } else {
          console.log('  ✅ No references from other sessions');
        }
      }
    }
    
    // 5. Suggestions for viewing logs
    console.log('\n5️⃣ WHERE TO VIEW LOGS:\n');
    console.log('1. Frontend Console:');
    console.log('   - Check browser console for the apply function response');
    console.log('   - Look for: "Apply selected changes response:" in console');
    console.log('   - The response contains: errors array with detailed error messages');
    console.log('\n2. Database:');
    console.log('   - extraction_listing_changes.review_notes: Contains apply errors');
    console.log('   - extraction_listing_changes.change_status: "rejected" = failed');
    console.log('\n3. Supabase Dashboard:');
    console.log('   - Go to: Logs > Edge Functions');
    console.log('   - Filter by function: apply_selected_extraction_changes');
    console.log('   - Look for error logs');
    
    // 6. Check if migration was applied
    console.log('\n6️⃣ Checking if Latest Migration is Applied:\n');
    console.log('The fix should delete ALL extraction_listing_changes references.');
    console.log('If deletions are still failing, the migration might not be active.');
    
  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
  }
}

// Run
checkExtractionDeletionLogs().catch(console.error);