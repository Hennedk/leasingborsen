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

async function checkDeletionData() {
  console.log('🔍 Checking Deletion Data Structure\n');
  
  try {
    const sessionId = '544e0e65-5f8b-4a8a-8cb9-2bf395309381';
    
    // Get first few deletions to check structure
    const { data: deletions, error } = await supabase
      .from('extraction_listing_changes')
      .select('*')
      .eq('session_id', sessionId)
      .eq('change_type', 'delete')
      .limit(3);

    if (error) throw error;

    console.log(`\nChecking ${deletions.length} deletion records:\n`);
    
    deletions.forEach((deletion, idx) => {
      console.log(`Deletion ${idx + 1}:`);
      console.log('  ID:', deletion.id);
      console.log('  Status:', deletion.change_status);
      console.log('  Has existing_data:', !!deletion.existing_data);
      console.log('  Has new_data:', !!deletion.new_data);
      console.log('  Has extracted_data:', !!deletion.extracted_data);
      console.log('  Has listing_id:', !!deletion.listing_id);
      
      // Check what data is actually there
      if (deletion.existing_data) {
        console.log('\n  existing_data contents:');
        console.log('    Keys:', Object.keys(deletion.existing_data).join(', '));
        if (deletion.existing_data.deletion_data) {
          console.log('    Has deletion_data:', true);
          console.log('    Deletion data:', JSON.stringify(deletion.existing_data.deletion_data, null, 2));
        }
      }
      
      if (deletion.new_data) {
        console.log('\n  new_data contents:');
        console.log('    Keys:', Object.keys(deletion.new_data).join(', '));
      }
      
      if (deletion.extracted_data) {
        console.log('\n  extracted_data contents:');
        console.log('    Keys:', Object.keys(deletion.extracted_data).join(', '));
      }
      
      console.log('\n' + '-'.repeat(60) + '\n');
    });
    
    // Get the actual deletion data
    console.log('Looking for deletion information in data fields...\n');
    
    deletions.forEach((deletion, idx) => {
      const data = deletion.existing_data || deletion.new_data || deletion.extracted_data || {};
      
      if (data.deletion_data && Array.isArray(data.deletion_data)) {
        console.log(`\nDeletion ${idx + 1} - Listings to be deleted:`);
        data.deletion_data.forEach((listing, listIdx) => {
          console.log(`  ${listIdx + 1}. ${listing.make} ${listing.model} - ${listing.variant}`);
          console.log(`     ID: ${listing.listing_id}`);
          console.log(`     HP: ${listing.horsepower || 'N/A'}`);
        });
      }
    });
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

// Run check
checkDeletionData().catch(console.error);