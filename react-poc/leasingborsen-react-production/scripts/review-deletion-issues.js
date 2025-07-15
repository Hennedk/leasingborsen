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

async function reviewDeletionIssues() {
  console.log('🔍 Reviewing Extraction Session: 544e0e65-5f8b-4a8a-8cb9-2bf395309381\n');
  console.log('=' .repeat(80));
  
  try {
    const sessionId = '544e0e65-5f8b-4a8a-8cb9-2bf395309381';
    
    // Get extraction session details
    const { data: session, error: sessionError } = await supabase
      .from('extraction_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError) throw sessionError;

    console.log('\nExtraction Session:');
    console.log('  ID:', session.id);
    console.log('  Name:', session.session_name);
    console.log('  Status:', session.status);
    console.log('  Seller ID:', session.seller_id);
    console.log('  Total Extracted:', session.total_extracted);
    console.log('  Created:', new Date(session.created_at).toLocaleString());
    
    // Get all changes for this session
    const { data: allChanges, error: changesError } = await supabase
      .from('extraction_listing_changes')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at');

    if (changesError) throw changesError;

    // Group changes by type and status
    const changesByTypeAndStatus = {};
    allChanges.forEach(change => {
      const key = `${change.change_type}_${change.change_status}`;
      changesByTypeAndStatus[key] = (changesByTypeAndStatus[key] || 0) + 1;
    });
    
    console.log('\n' + '=' .repeat(80));
    console.log('\nChange Summary:');
    console.log('  Total Changes:', allChanges.length);
    Object.entries(changesByTypeAndStatus).forEach(([key, count]) => {
      const [type, status] = key.split('_');
      console.log(`  ${type} (${status}): ${count}`);
    });
    
    // Focus on deletions
    const deletions = allChanges.filter(c => c.change_type === 'delete');
    const appliedDeletions = deletions.filter(c => c.change_status === 'applied');
    const failedDeletions = deletions.filter(c => c.change_status === 'failed');
    const pendingDeletions = deletions.filter(c => c.change_status === 'pending');
    
    console.log('\n' + '=' .repeat(80));
    console.log('\n🗑️  DELETION ANALYSIS:');
    console.log(`  Total Deletions: ${deletions.length}`);
    console.log(`  Applied: ${appliedDeletions.length}`);
    console.log(`  Failed: ${failedDeletions.length}`);
    console.log(`  Pending: ${pendingDeletions.length}`);
    
    // Check applied deletions
    if (appliedDeletions.length > 0) {
      console.log('\n\n📋 APPLIED DELETIONS (First 10):');
      console.log('-'.repeat(60));
      
      for (let i = 0; i < Math.min(10, appliedDeletions.length); i++) {
        const deletion = appliedDeletions[i];
        const existingData = deletion.existing_data;
        
        console.log(`\n${i + 1}. Deletion Record:`);
        console.log(`   Change ID: ${deletion.id}`);
        console.log(`   Status: ${deletion.change_status}`);
        console.log(`   Applied By: ${deletion.applied_by || 'Unknown'}`);
        
        if (existingData) {
          console.log(`   Listing to Delete: ${existingData.make} ${existingData.model} ${existingData.variant}`);
          console.log(`   Original Listing ID: ${existingData.listing_id || deletion.listing_id || 'Unknown'}`);
          
          // Check if the listing still exists
          const listingId = existingData.listing_id || deletion.listing_id;
          if (listingId) {
            const { data: stillExists, error: checkError } = await supabase
              .from('listings')
              .select('id, status, updated_at')
              .eq('id', listingId)
              .single();
              
            if (!checkError && stillExists) {
              console.log(`   ❌ PROBLEM: Listing still exists in database!`);
              console.log(`      Current Status: ${stillExists.status}`);
              console.log(`      Last Updated: ${new Date(stillExists.updated_at).toLocaleString()}`);
            } else if (checkError && checkError.code === 'PGRST116') {
              console.log(`   ✅ Confirmed: Listing was deleted from database`);
            } else {
              console.log(`   ⚠️  Error checking: ${checkError?.message}`);
            }
          }
        }
      }
    }
    
    // Check failed deletions
    if (failedDeletions.length > 0) {
      console.log('\n\n❌ FAILED DELETIONS (First 5):');
      console.log('-'.repeat(60));
      
      failedDeletions.slice(0, 5).forEach((deletion, idx) => {
        console.log(`\n${idx + 1}. Failed Deletion:`);
        console.log(`   Error: ${deletion.error_message || 'No error message'}`);
        if (deletion.existing_data) {
          console.log(`   Listing: ${deletion.existing_data.make} ${deletion.existing_data.model}`);
        }
      });
    }
    
    // Check the apply_selected_extraction_changes function
    console.log('\n\n' + '=' .repeat(80));
    console.log('\n🔧 CHECKING DELETION FUNCTION:');
    
    // Let's run a test to see what the function returns
    const { data: functionTest, error: functionError } = await supabase
      .rpc('apply_selected_extraction_changes', {
        p_session_id: sessionId,
        p_change_ids: [],
        p_user_id: session.seller_id
      });
      
    if (functionError) {
      console.log('  ❌ Function Error:', functionError.message);
    } else {
      console.log('  ✅ Function callable');
    }
    
    // Get a sample of listings that should have been deleted
    console.log('\n\n' + '=' .repeat(80));
    console.log('\n🔍 CHECKING ACTUAL DATABASE STATE:');
    
    // Get seller's current listings
    const { count: currentListingCount } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', session.seller_id)
      .eq('status', 'available');
      
    console.log(`\nCurrent active listings for seller: ${currentListingCount}`);
    
    // Check specific deletions
    const sampleDeletions = appliedDeletions.slice(0, 3);
    console.log('\nChecking specific deletions:');
    
    for (const deletion of sampleDeletions) {
      if (deletion.existing_data) {
        const { data: searchResults } = await supabase
          .from('listings')
          .select('id, variant, status')
          .eq('seller_id', session.seller_id)
          .eq('variant', deletion.existing_data.variant)
          .eq('make_id', deletion.existing_data.make_id)
          .eq('model_id', deletion.existing_data.model_id);
          
        console.log(`\n  Variant: "${deletion.existing_data.variant}"`);
        if (searchResults && searchResults.length > 0) {
          console.log(`  ❌ Still found ${searchResults.length} matching listing(s):`);
          searchResults.forEach(listing => {
            console.log(`     - ID: ${listing.id}, Status: ${listing.status}`);
          });
        } else {
          console.log(`  ✅ No matching listings found (properly deleted)`);
        }
      }
    }
    
    // Summary and recommendations
    console.log('\n\n' + '=' .repeat(80));
    console.log('\n📊 SUMMARY & RECOMMENDATIONS:\n');
    
    if (appliedDeletions.length > 0) {
      const stillExistCount = await checkHowManyStillExist(appliedDeletions);
      
      if (stillExistCount > 0) {
        console.log(`⚠️  ISSUE FOUND: ${stillExistCount} of ${appliedDeletions.length} "applied" deletions still exist in database!`);
        console.log('\nPossible causes:');
        console.log('1. The apply_selected_extraction_changes function may not be properly deleting listings');
        console.log('2. There might be a transaction rollback issue');
        console.log('3. The deletion logic might be updating status instead of actually deleting');
        console.log('4. Foreign key constraints might be preventing deletion');
        console.log('\nRecommended actions:');
        console.log('1. Check the apply_selected_extraction_changes function implementation');
        console.log('2. Verify CASCADE DELETE is set on foreign key relationships');
        console.log('3. Check if deletions are soft (status change) vs hard (DELETE)');
      } else {
        console.log('✅ All applied deletions were successfully removed from the database');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

async function checkHowManyStillExist(appliedDeletions) {
  let stillExistCount = 0;
  
  for (const deletion of appliedDeletions) {
    const listingId = deletion.existing_data?.listing_id || deletion.listing_id;
    if (listingId) {
      const { data, error } = await supabase
        .from('listings')
        .select('id')
        .eq('id', listingId)
        .single();
        
      if (data && !error) {
        stillExistCount++;
      }
    }
  }
  
  return stillExistCount;
}

// Run the review
reviewDeletionIssues().catch(console.error);