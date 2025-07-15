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

async function fixDeletionConstraintIssue() {
  const sessionId = '91d57eee-517b-4a22-8185-7fa000d584c0';
  const listingId = 'e5841862-1d46-4450-9710-6f7c037741ba';
  
  console.log('🔧 FIXING DELETION CONSTRAINT ISSUE');
  console.log('=' .repeat(80));
  console.log(`Session ID: ${sessionId}`);
  console.log(`Listing ID: ${listingId}`);
  console.log('=' .repeat(80));

  try {
    // 1. Find ALL extraction_listing_changes that reference this listing
    console.log('\n1️⃣ Finding ALL references to this listing in extraction_listing_changes...\n');
    
    const { data: allReferences, error: refError } = await supabase
      .from('extraction_listing_changes')
      .select('*')
      .eq('existing_listing_id', listingId)
      .order('created_at', { ascending: false });

    if (refError) {
      console.error('Error fetching references:', refError);
      return;
    }

    console.log(`Found ${allReferences.length} references to this listing:`);
    allReferences.forEach((ref, idx) => {
      console.log(`\n  Reference ${idx + 1}:`);
      console.log(`    ID: ${ref.id}`);
      console.log(`    Session: ${ref.session_id}`);
      console.log(`    Type: ${ref.change_type}`);
      console.log(`    Status: ${ref.change_status}`);
      console.log(`    Created: ${new Date(ref.created_at).toLocaleString()}`);
    });

    // 2. Identify the problem
    console.log('\n2️⃣ Problem Analysis...\n');
    
    const currentDeletion = allReferences.find(ref => 
      ref.session_id === sessionId && ref.change_type === 'delete'
    );
    
    if (!currentDeletion) {
      console.log('❌ No deletion record found for current session!');
      return;
    }

    console.log('Current deletion record:');
    console.log('  Status:', currentDeletion.change_status);
    console.log('  Review notes:', currentDeletion.review_notes);
    
    if (currentDeletion.change_status === 'rejected') {
      console.log('\n⚠️  The deletion was already attempted and rejected!');
      console.log('  Reason: Foreign key constraint violation');
      console.log('\n  This happens because the apply function tries to delete the listing');
      console.log('  but other extraction_listing_changes records still reference it.');
    }

    // 3. Check what the apply function's deletion logic does
    console.log('\n3️⃣ Understanding the deletion logic...\n');
    console.log('The apply_selected_extraction_changes function does:');
    console.log('  1. Deletes extraction_listing_changes WHERE existing_listing_id = listing_id');
    console.log('     AND change_status IN (\'pending\', \'discarded\')');
    console.log('     AND id != current_change_id');
    console.log('  2. Deletes from price_change_log');
    console.log('  3. Deletes from lease_pricing');
    console.log('  4. Deletes from listings');
    
    // 4. Fix the issue
    console.log('\n4️⃣ Fixing the issue...\n');
    
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      rl.question('Do you want to:\n  1. Reset the deletion to "pending" and retry\n  2. Manually clean up and delete\n  3. Exit without changes\n\nChoice (1/2/3): ', resolve);
    });
    rl.close();

    if (answer === '1') {
      console.log('\n🔄 Resetting deletion status to pending...');
      
      // First, reset the deletion record to pending
      const { error: resetError } = await supabase
        .from('extraction_listing_changes')
        .update({ 
          change_status: 'pending',
          review_notes: null,
          reviewed_at: null,
          applied_by: null
        })
        .eq('id', currentDeletion.id);

      if (resetError) {
        console.error('Error resetting status:', resetError);
        return;
      }

      console.log('✅ Reset successful!');
      console.log('\n🚀 Attempting to apply the deletion again...');
      
      const { data: applyResult, error: applyError } = await supabase
        .rpc('apply_selected_extraction_changes', {
          p_session_id: sessionId,
          p_selected_change_ids: [currentDeletion.id],
          p_applied_by: 'fix_script'
        });

      if (applyError) {
        console.error('❌ Apply error:', applyError);
      } else {
        console.log('✅ Apply result:', JSON.stringify(applyResult, null, 2));
        
        // Check if listing was deleted
        const { data: checkListing } = await supabase
          .from('listings')
          .select('id')
          .eq('id', listingId)
          .single();
          
        if (!checkListing) {
          console.log('\n🎉 SUCCESS: Listing was deleted!');
        } else {
          console.log('\n⚠️  Listing still exists. There may be other issues.');
        }
      }
      
    } else if (answer === '2') {
      console.log('\n🧹 Manually cleaning up references and deleting...');
      
      // Delete all extraction_listing_changes for this listing except the current deletion
      console.log('  - Removing other extraction_listing_changes references...');
      const { error: cleanupError } = await supabase
        .from('extraction_listing_changes')
        .delete()
        .eq('existing_listing_id', listingId)
        .neq('id', currentDeletion.id);
        
      if (cleanupError) {
        console.error('Cleanup error:', cleanupError);
        return;
      }

      // Delete lease pricing
      console.log('  - Removing lease_pricing...');
      const { error: lpError } = await supabase
        .from('lease_pricing')
        .delete()
        .eq('listing_id', listingId);
        
      if (lpError) {
        console.error('Lease pricing error:', lpError);
      }

      // Delete price change log if exists
      console.log('  - Removing price_change_log...');
      const { error: pclError } = await supabase
        .from('price_change_log')
        .delete()
        .eq('listing_id', listingId);
        
      if (pclError && pclError.code !== '42P01') { // Ignore if table doesn't exist
        console.error('Price change log error:', pclError);
      }

      // Finally delete the listing
      console.log('  - Deleting the listing...');
      const { error: deleteError } = await supabase
        .from('listings')
        .delete()
        .eq('id', listingId);
        
      if (deleteError) {
        console.error('❌ Delete error:', deleteError);
      } else {
        console.log('✅ Listing deleted successfully!');
        
        // Update the extraction change to reflect success
        await supabase
          .from('extraction_listing_changes')
          .update({ 
            change_status: 'applied',
            reviewed_at: new Date().toISOString(),
            applied_by: 'manual_fix'
          })
          .eq('id', currentDeletion.id);
      }
      
    } else {
      console.log('\n👋 Exiting without changes.');
    }

  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
  }
}

// Run the fix script
fixDeletionConstraintIssue().catch(console.error);