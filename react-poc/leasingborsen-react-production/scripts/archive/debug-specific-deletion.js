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

async function debugSpecificDeletion() {
  const sessionId = '91d57eee-517b-4a22-8185-7fa000d584c0';
  const listingId = 'e5841862-1d46-4450-9710-6f7c037741ba';
  
  console.log('🔍 DEBUGGING SPECIFIC DELETION FAILURE');
  console.log('=' .repeat(80));
  console.log(`Session ID: ${sessionId}`);
  console.log(`Listing ID: ${listingId}`);
  console.log('=' .repeat(80));

  try {
    // 1. Check if the deletion change record exists
    console.log('\n1️⃣ Checking extraction_listing_changes for deletion record...\n');
    
    const { data: changeRecords, error: changeError } = await supabase
      .from('extraction_listing_changes')
      .select('*')
      .eq('session_id', sessionId)
      .eq('existing_listing_id', listingId)
      .eq('change_type', 'delete');

    if (changeError) {
      console.error('Error fetching change records:', changeError);
      return;
    }

    if (!changeRecords || changeRecords.length === 0) {
      console.log('❌ NO DELETION RECORD FOUND!');
      console.log('\nSearching for ANY change records with this listing ID...');
      
      const { data: anyRecords } = await supabase
        .from('extraction_listing_changes')
        .select('*')
        .eq('existing_listing_id', listingId);
        
      if (anyRecords && anyRecords.length > 0) {
        console.log(`\nFound ${anyRecords.length} change records for this listing:`);
        anyRecords.forEach(rec => {
          console.log(`  - Type: ${rec.change_type}, Status: ${rec.change_status}, Session: ${rec.session_id}`);
        });
      }
      
      return;
    }

    console.log(`✅ Found ${changeRecords.length} deletion record(s):`);
    changeRecords.forEach((record, idx) => {
      console.log(`\nDeletion Record ${idx + 1}:`);
      console.log('  ID:', record.id);
      console.log('  Change Type:', record.change_type);
      console.log('  Change Status:', record.change_status);
      console.log('  Existing Listing ID:', record.existing_listing_id);
      console.log('  Extracted Data:', JSON.stringify(record.extracted_data, null, 2));
      console.log('  Created At:', new Date(record.created_at).toLocaleString());
      console.log('  Reviewed At:', record.reviewed_at ? new Date(record.reviewed_at).toLocaleString() : 'Not reviewed');
      console.log('  Applied By:', record.applied_by || 'Not set');
    });

    // 2. Check if the listing still exists
    console.log('\n2️⃣ Checking if listing still exists in database...\n');
    
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .single();

    if (listingError && listingError.code !== 'PGRST116') {
      console.error('Error fetching listing:', listingError);
    } else if (!listing) {
      console.log('❌ LISTING NOT FOUND - Already deleted?');
    } else {
      console.log('✅ Listing still exists:');
      console.log('  Make ID:', listing.make_id);
      console.log('  Model ID:', listing.model_id);
      console.log('  Variant:', listing.variant);
      console.log('  Created:', new Date(listing.created_at).toLocaleString());
      console.log('  Updated:', new Date(listing.updated_at).toLocaleString());
    }

    // 3. Check for foreign key references
    console.log('\n3️⃣ Checking for foreign key references...\n');
    
    // Check lease_pricing
    const { data: leasePricing, error: lpError } = await supabase
      .from('lease_pricing')
      .select('id')
      .eq('listing_id', listingId);
      
    if (!lpError && leasePricing) {
      console.log(`  - lease_pricing: ${leasePricing.length} record(s)`);
    }

    // Check price_change_log if it exists
    const { data: priceChanges } = await supabase
      .from('price_change_log')
      .select('id')
      .eq('listing_id', listingId);
      
    if (priceChanges) {
      console.log(`  - price_change_log: ${priceChanges.length} record(s)`);
    }

    // Check other extraction_listing_changes
    const { data: otherChanges } = await supabase
      .from('extraction_listing_changes')
      .select('id, session_id, change_type, change_status')
      .eq('existing_listing_id', listingId)
      .neq('change_type', 'delete');
      
    if (otherChanges && otherChanges.length > 0) {
      console.log(`  - extraction_listing_changes (non-delete): ${otherChanges.length} record(s)`);
      otherChanges.forEach(ch => {
        console.log(`    • Session: ${ch.session_id}, Type: ${ch.change_type}, Status: ${ch.change_status}`);
      });
    }

    // 4. Test the apply function directly
    console.log('\n4️⃣ Testing apply_selected_extraction_changes function...\n');
    
    if (changeRecords && changeRecords.length > 0) {
      const changeId = changeRecords[0].id;
      console.log(`Attempting to apply deletion with change ID: ${changeId}`);
      
      const { data: applyResult, error: applyError } = await supabase
        .rpc('apply_selected_extraction_changes', {
          p_session_id: sessionId,
          p_selected_change_ids: [changeId],
          p_applied_by: 'debug_script'
        });

      if (applyError) {
        console.error('❌ Apply function error:', applyError);
      } else {
        console.log('✅ Apply function result:', JSON.stringify(applyResult, null, 2));
        
        // Check if listing was actually deleted
        const { data: checkListing } = await supabase
          .from('listings')
          .select('id')
          .eq('id', listingId)
          .single();
          
        if (!checkListing) {
          console.log('\n🎉 SUCCESS: Listing was deleted!');
        } else {
          console.log('\n⚠️  WARNING: Listing still exists after apply!');
        }
      }
    }

    // 5. Additional debugging info
    console.log('\n5️⃣ Additional debugging information...\n');
    
    // Check session status
    const { data: session } = await supabase
      .from('extraction_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
      
    if (session) {
      console.log('Session Status:', session.status);
      console.log('Total Deleted:', session.total_deleted);
      console.log('Applied At:', session.applied_at ? new Date(session.applied_at).toLocaleString() : 'Not applied');
    }

    // Check for any errors in the function
    console.log('\n6️⃣ Checking for logged errors or rejections...\n');
    
    const { data: rejectedChanges } = await supabase
      .from('extraction_listing_changes')
      .select('*')
      .eq('session_id', sessionId)
      .eq('change_status', 'rejected');
      
    if (rejectedChanges && rejectedChanges.length > 0) {
      console.log(`Found ${rejectedChanges.length} rejected changes in this session:`);
      rejectedChanges.forEach(rej => {
        if (rej.review_notes) {
          console.log(`  - ${rej.change_type}: ${rej.review_notes}`);
        }
      });
    }

  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
  }
}

// Run the debug script
debugSpecificDeletion().catch(console.error);