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

async function analyzeDeletionStructure() {
  console.log('🔍 Analyzing Deletion Record Structure\n');
  console.log('=' .repeat(80));
  
  try {
    // Get deletions from multiple sessions to see the pattern
    const { data: recentDeletions, error } = await supabase
      .from('extraction_listing_changes')
      .select('*')
      .eq('change_type', 'delete')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    console.log(`\nAnalyzing ${recentDeletions.length} deletion records:\n`);
    
    // Analyze structure
    const structures = {
      hasListingId: 0,
      hasExistingListingId: 0,
      hasExtractedData: 0,
      hasExistingData: 0,
      hasNewData: 0,
      statuses: {}
    };
    
    recentDeletions.forEach((del, idx) => {
      if (del.listing_id) structures.hasListingId++;
      if (del.existing_listing_id) structures.hasExistingListingId++;
      if (del.extracted_data && Object.keys(del.extracted_data).length > 0) structures.hasExtractedData++;
      if (del.existing_data && Object.keys(del.existing_data).length > 0) structures.hasExistingData++;
      if (del.new_data && Object.keys(del.new_data).length > 0) structures.hasNewData++;
      
      structures.statuses[del.change_status] = (structures.statuses[del.change_status] || 0) + 1;
      
      if (idx < 3) {
        console.log(`Deletion ${idx + 1}:`);
        console.log(`  Session: ${del.session_id.substring(0, 8)}...`);
        console.log(`  Status: ${del.change_status}`);
        console.log(`  listing_id: ${del.listing_id || 'NULL'}`);
        console.log(`  existing_listing_id: ${del.existing_listing_id || 'NULL'}`);
        console.log(`  extracted_data: ${JSON.stringify(del.extracted_data || {})}`);
        console.log(`  existing_data: ${del.existing_data ? 'Has data' : 'NULL'}`);
        console.log(`  new_data: ${del.new_data ? 'Has data' : 'NULL'}`);
        console.log('');
      }
    });
    
    console.log('=' .repeat(80));
    console.log('\n📊 Structure Analysis:');
    console.log(`  Has listing_id: ${structures.hasListingId}/${recentDeletions.length}`);
    console.log(`  Has existing_listing_id: ${structures.hasExistingListingId}/${recentDeletions.length}`);
    console.log(`  Has extracted_data: ${structures.hasExtractedData}/${recentDeletions.length}`);
    console.log(`  Has existing_data: ${structures.hasExistingData}/${recentDeletions.length}`);
    console.log(`  Has new_data: ${structures.hasNewData}/${recentDeletions.length}`);
    
    console.log('\nStatus distribution:');
    Object.entries(structures.statuses).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    
    // Check a successful deletion vs rejected deletion
    const appliedDeletion = recentDeletions.find(d => d.change_status === 'applied');
    const rejectedDeletion = recentDeletions.find(d => d.change_status === 'rejected');
    
    console.log('\n' + '=' .repeat(80));
    console.log('\n🔄 Comparing Applied vs Rejected:\n');
    
    if (appliedDeletion) {
      console.log('Applied Deletion:');
      console.log(`  Has existing_listing_id: ${!!appliedDeletion.existing_listing_id}`);
      console.log(`  Applied by: ${appliedDeletion.applied_by || 'Unknown'}`);
    } else {
      console.log('No applied deletions found in recent records');
    }
    
    if (rejectedDeletion) {
      console.log('\nRejected Deletion:');
      console.log(`  Has existing_listing_id: ${!!rejectedDeletion.existing_listing_id}`);
      console.log(`  Applied by: ${rejectedDeletion.applied_by || 'Unknown'}`);
    }
    
    // Check if the function expects existing_listing_id for deletions
    console.log('\n' + '=' .repeat(80));
    console.log('\n💡 KEY FINDING:\n');
    
    if (structures.hasExistingListingId > structures.hasListingId) {
      console.log('✅ Deletion records use `existing_listing_id` field');
      console.log('   The apply function should look for this field for deletions');
    } else {
      console.log('⚠️  Deletion records might be missing proper listing references');
    }
    
    // Test calling the function with a real deletion
    const testDeletion = recentDeletions.find(d => d.existing_listing_id && d.change_status === 'rejected');
    if (testDeletion) {
      console.log('\n🧪 Test scenario:');
      console.log(`  Deletion ID: ${testDeletion.id}`);
      console.log(`  Existing Listing ID: ${testDeletion.existing_listing_id}`);
      console.log(`  Current Status: ${testDeletion.change_status}`);
      console.log('\nIf you select this deletion and click Apply:');
      console.log('1. It should change status from "rejected" to "applied"');
      console.log('2. The listing should be deleted from the database');
      console.log('3. But currently it stays as "rejected"');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

// Run analysis
analyzeDeletionStructure().catch(console.error);